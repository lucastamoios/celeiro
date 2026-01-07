package webhooks

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	financialApp "github.com/catrutech/celeiro/internal/application/financial"
	"github.com/catrutech/celeiro/internal/web/responses"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
)

type Handler struct {
	app    *application.Application
	logger logging.Logger
}

func NewHandler(app *application.Application, logger logging.Logger) *Handler {
	return &Handler{
		app:    app,
		logger: logger,
	}
}

// ResendInboundEmail represents the payload from Resend's inbound email webhook
// https://resend.com/docs/dashboard/webhooks/inbound-emails
type ResendInboundEmail struct {
	From        string                    `json:"from"`
	To          []string                  `json:"to"`
	Subject     string                    `json:"subject"`
	Text        string                    `json:"text"`
	HTML        string                    `json:"html"`
	Attachments []ResendEmailAttachment   `json:"attachments"`
	Headers     []ResendEmailHeader       `json:"headers"`
	CreatedAt   string                    `json:"created_at"`
}

type ResendEmailAttachment struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Content     string `json:"content"` // Base64 encoded
}

type ResendEmailHeader struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// HandleResendInbound handles inbound emails from Resend
// POST /webhooks/email/inbound
func (h *Handler) HandleResendInbound(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse the webhook payload
	var email ResendInboundEmail
	if err := json.NewDecoder(r.Body).Decode(&email); err != nil {
		h.logger.Warn(ctx, "Failed to parse inbound email webhook", "error", err)
		// Return 200 to prevent Resend from retrying
		w.WriteHeader(http.StatusOK)
		return
	}

	h.logger.Info(ctx, "Received inbound email",
		"from", email.From,
		"to", email.To,
		"subject", email.Subject,
		"attachment_count", len(email.Attachments),
	)

	// Extract sender email (format: "Name <email@domain.com>" or just "email@domain.com")
	senderEmail := extractEmailAddress(email.From)
	if senderEmail == "" {
		h.logger.Warn(ctx, "Could not extract sender email", "from", email.From)
		w.WriteHeader(http.StatusOK)
		return
	}

	// Look up user by email
	user, err := h.app.AccountsService.GetUserByEmail(ctx, accounts.GetUserByEmailInput{Email: senderEmail})
	if err != nil {
		h.logger.Info(ctx, "Sender email not found in system, ignoring",
			"email", senderEmail,
		)
		// Return 200 - we don't want Resend to retry for unknown senders
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get user's organizations to find their accounts
	orgs, err := h.app.AccountsService.GetOrganizationsByUser(ctx, accounts.GetOrganizationsByUserInput{UserID: user.UserID})
	if err != nil || len(orgs) == 0 {
		h.logger.Warn(ctx, "User has no organizations", "user_id", user.UserID)
		w.WriteHeader(http.StatusOK)
		return
	}

	// Use the first (or default) organization
	organizationID := orgs[0].OrganizationID

	// Extract OFX attachments
	ofxAttachments := filterOFXAttachments(email.Attachments)
	if len(ofxAttachments) == 0 {
		h.logger.Info(ctx, "No OFX attachments found in email",
			"email", senderEmail,
			"attachment_count", len(email.Attachments),
		)
		w.WriteHeader(http.StatusOK)
		return
	}

	// Parse account name from subject (optional)
	// Subject can be like "Import to Checking" or "Nubank" or just empty
	targetAccountName := parseAccountNameFromSubject(email.Subject)

	// Get user's accounts
	accounts, err := h.app.FinancialService.GetAccounts(ctx, financialApp.GetAccountsInput{
		OrganizationID: organizationID,
	})
	if err != nil || len(accounts) == 0 {
		h.logger.Warn(ctx, "User has no accounts", "user_id", user.UserID)
		h.sendImportResultEmail(ctx, senderEmail, user.Name, nil, "You don't have any accounts set up yet. Please create an account first.")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Find target account
	var targetAccount *financialApp.Account
	if targetAccountName != "" {
		// Try to match by name (case-insensitive)
		for i := range accounts {
			if strings.EqualFold(accounts[i].Name, targetAccountName) {
				targetAccount = &accounts[i]
				break
			}
			// Also try partial match
			if strings.Contains(strings.ToLower(accounts[i].Name), strings.ToLower(targetAccountName)) {
				targetAccount = &accounts[i]
				break
			}
		}
	}

	// If no account specified or not found, use the first active account
	if targetAccount == nil {
		for i := range accounts {
			if accounts[i].IsActive {
				targetAccount = &accounts[i]
				break
			}
		}
	}

	if targetAccount == nil {
		h.logger.Warn(ctx, "No suitable account found",
			"user_id", user.UserID,
			"requested_account", targetAccountName,
		)
		h.sendImportResultEmail(ctx, senderEmail, user.Name, nil,
			fmt.Sprintf("Could not find account '%s'. Available accounts: %s",
				targetAccountName, formatAccountNames(accounts)))
		w.WriteHeader(http.StatusOK)
		return
	}

	// Process each OFX attachment
	var results []ImportResult
	for _, attachment := range ofxAttachments {
		// Decode base64 content
		ofxData, err := base64.StdEncoding.DecodeString(attachment.Content)
		if err != nil {
			h.logger.Warn(ctx, "Failed to decode OFX attachment",
				"filename", attachment.Filename,
				"error", err,
			)
			results = append(results, ImportResult{
				Filename: attachment.Filename,
				Success:  false,
				Error:    "Failed to decode file",
			})
			continue
		}

		// Import the OFX data
		output, err := h.app.FinancialService.ImportTransactionsFromOFX(ctx, financialApp.ImportOFXInput{
			UserID:         user.UserID,
			OrganizationID: organizationID,
			AccountID:      targetAccount.AccountID,
			OFXData:        ofxData,
		})

		if err != nil {
			h.logger.Warn(ctx, "Failed to import OFX",
				"filename", attachment.Filename,
				"error", err,
			)
			results = append(results, ImportResult{
				Filename: attachment.Filename,
				Success:  false,
				Error:    err.Error(),
			})
			continue
		}

		h.logger.Info(ctx, "Successfully imported OFX via email",
			"filename", attachment.Filename,
			"account", targetAccount.Name,
			"imported", output.ImportedCount,
			"duplicates", output.DuplicateCount,
		)

		results = append(results, ImportResult{
			Filename:       attachment.Filename,
			Success:        true,
			ImportedCount:  output.ImportedCount,
			DuplicateCount: output.DuplicateCount,
			AccountName:    targetAccount.Name,
		})
	}

	// Send confirmation email
	h.sendImportResultEmail(ctx, senderEmail, user.Name, results, "")

	w.WriteHeader(http.StatusOK)
	responses.NewSuccess(map[string]interface{}{
		"processed": len(results),
	}, w)
}

type ImportResult struct {
	Filename       string
	Success        bool
	Error          string
	ImportedCount  int
	DuplicateCount int
	AccountName    string
}

func (h *Handler) sendImportResultEmail(ctx context.Context, toEmail, userName string, results []ImportResult, errorMessage string) {
	// Build email content
	var subject string
	var body string

	if errorMessage != "" {
		subject = "OFX Import Failed"
		body = fmt.Sprintf("Hello %s,\n\nWe couldn't process your OFX import:\n\n%s\n\nPlease try again or import directly through the app.", userName, errorMessage)
	} else if len(results) == 0 {
		subject = "OFX Import - No Files Found"
		body = fmt.Sprintf("Hello %s,\n\nWe received your email but couldn't find any OFX files attached.\n\nPlease make sure to attach .ofx files to your email.", userName)
	} else {
		// Build results summary
		var successCount, failCount, totalImported, totalDuplicates int
		var details []string

		for _, r := range results {
			if r.Success {
				successCount++
				totalImported += r.ImportedCount
				totalDuplicates += r.DuplicateCount
				details = append(details, fmt.Sprintf("- %s: %d transactions imported to %s (%d duplicates skipped)",
					r.Filename, r.ImportedCount, r.AccountName, r.DuplicateCount))
			} else {
				failCount++
				details = append(details, fmt.Sprintf("- %s: Failed - %s", r.Filename, r.Error))
			}
		}

		if failCount == 0 {
			subject = fmt.Sprintf("OFX Import Complete - %d transactions imported", totalImported)
		} else if successCount == 0 {
			subject = "OFX Import Failed"
		} else {
			subject = fmt.Sprintf("OFX Import Partial - %d imported, %d failed", totalImported, failCount)
		}

		body = fmt.Sprintf("Hello %s,\n\nHere's the result of your OFX import:\n\n%s\n\nTotal: %d transactions imported, %d duplicates skipped.",
			userName, strings.Join(details, "\n"), totalImported, totalDuplicates)
	}

	// Send the email
	err := h.app.Mailer.SendPlainEmail(ctx, mailer.EmailMessage{
		To:      []string{toEmail},
		Subject: subject,
		Body:    body,
		IsHTML:  false,
	})

	if err != nil {
		h.logger.Warn(ctx, "Failed to send import result email",
			"to", toEmail,
			"error", err,
		)
	}
}

// extractEmailAddress extracts the email from formats like "Name <email@domain.com>" or "email@domain.com"
func extractEmailAddress(from string) string {
	// Check for angle bracket format
	if start := strings.Index(from, "<"); start != -1 {
		if end := strings.Index(from, ">"); end != -1 && end > start {
			return strings.TrimSpace(from[start+1 : end])
		}
	}
	// Assume it's just the email
	return strings.TrimSpace(from)
}

// filterOFXAttachments filters attachments to only include OFX files
func filterOFXAttachments(attachments []ResendEmailAttachment) []ResendEmailAttachment {
	var ofxFiles []ResendEmailAttachment
	for _, a := range attachments {
		filename := strings.ToLower(a.Filename)
		contentType := strings.ToLower(a.ContentType)

		// Check by extension or content type
		if strings.HasSuffix(filename, ".ofx") ||
			strings.HasSuffix(filename, ".qfx") ||
			contentType == "application/x-ofx" ||
			contentType == "application/ofx" {
			ofxFiles = append(ofxFiles, a)
		}
	}
	return ofxFiles
}

// parseAccountNameFromSubject extracts account name from email subject
// Supports formats like:
// - "Import to Checking"
// - "Nubank"
// - "import Nubank"
// - Empty string returns empty
func parseAccountNameFromSubject(subject string) string {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return ""
	}

	lower := strings.ToLower(subject)

	// Remove common prefixes
	prefixes := []string{"import to ", "import ", "ofx ", "upload to ", "upload "}
	for _, prefix := range prefixes {
		if strings.HasPrefix(lower, prefix) {
			return strings.TrimSpace(subject[len(prefix):])
		}
	}

	// Return the subject as-is (might be just the account name)
	return subject
}

// formatAccountNames returns a comma-separated list of account names
func formatAccountNames(accounts []financialApp.Account) string {
	var names []string
	for _, a := range accounts {
		if a.IsActive {
			names = append(names, a.Name)
		}
	}
	return strings.Join(names, ", ")
}
