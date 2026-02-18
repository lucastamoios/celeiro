package webhooks

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	stderrors "errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/application/financial"
	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/internal/errors"
	"github.com/catrutech/celeiro/internal/web/responses"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
)

type Handler struct {
	app                 *application.Application
	logger              logging.Logger
	resendAPIKey        string
	resendWebhookSecret string
	mailDomain          string
}

func NewHandler(app *application.Application, logger logging.Logger, cfg *config.Config) *Handler {
	return &Handler{
		app:                 app,
		logger:              logger,
		resendAPIKey:        cfg.Resend.APIKey,
		resendWebhookSecret: cfg.Resend.WebhookSecret,
		mailDomain:          cfg.MailDomain,
	}
}

// ResendInboundPayload represents the Resend inbound email webhook payload
type ResendInboundPayload struct {
	Type      string             `json:"type"`
	CreatedAt string             `json:"created_at"`
	Data      ResendInboundEmail `json:"data"`
}

// ResendInboundEmail represents the email data in the webhook payload
type ResendInboundEmail struct {
	EmailID     string                    `json:"email_id"`
	CreatedAt   string                    `json:"created_at"`
	From        string                    `json:"from"`
	To          []string                  `json:"to"`
	CC          []string                  `json:"cc"`
	BCC         []string                  `json:"bcc"`
	Subject     string                    `json:"subject"`
	Text        string                    `json:"text"`
	HTML        string                    `json:"html"`
	Attachments []ResendInboundAttachment `json:"attachments"`
}

// ResendInboundAttachment represents an attachment in the inbound email
type ResendInboundAttachment struct {
	ID                 string `json:"id"`
	Filename           string `json:"filename"`
	ContentType        string `json:"content_type"`
	ContentDisposition string `json:"content_disposition"`
	ContentID          string `json:"content_id"`
	Content            string `json:"content"` // Base64 encoded content (if included directly)
}

// ResendAttachmentResponse represents the response from Resend's attachment API
type ResendAttachmentResponse struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	DownloadURL string `json:"download_url"`
	Content     string `json:"content"` // Base64 encoded
}

// EmailInboundResponse represents the response for the email inbound webhook
type EmailInboundResponse struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	AccountName    string `json:"account_name,omitempty"`
	ImportedCount  int    `json:"imported_count,omitempty"`
	DuplicateCount int    `json:"duplicate_count,omitempty"`
}

// HandleEmailInbound handles inbound email webhooks from Resend
// POST /webhooks/email/inbound
func (h *Handler) HandleEmailInbound(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Read raw body for signature verification
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error(ctx, "Failed to read webhook body", "error", err)
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Verify webhook signature if secret is configured
	if h.resendWebhookSecret != "" {
		if err := h.verifyWebhookSignature(r.Header, body); err != nil {
			h.logger.Error(ctx, "Webhook signature verification failed", "error", err)
			responses.NewError(w, errors.ErrUnauthorized)
			return
		}
	}

	// Parse the webhook payload
	var payload ResendInboundPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		h.logger.Error(ctx, "Failed to decode webhook payload", "error", err)
		responses.NewError(w, errors.ErrInvalidRequestBody)
		return
	}

	// Verify this is an email.received event
	if payload.Type != "email.received" {
		h.logger.Info(ctx, "Ignoring non-email.received webhook", "type", payload.Type)
		responses.NewSuccess(EmailInboundResponse{
			Success: true,
			Message: "Event type ignored",
		}, w)
		return
	}

	h.logger.Info(ctx, "Processing inbound email",
		"email_id", payload.Data.EmailID,
		"from", payload.Data.From,
		"to", payload.Data.To,
		"subject", payload.Data.Subject,
		"attachment_count", len(payload.Data.Attachments),
	)

	// Check if this is a Gmail forwarding verification email
	if isGmailForwardingVerification(payload.Data.From, payload.Data.Subject) {
		h.handleGmailForwardingVerification(ctx, payload.Data, w)
		return
	}

	// Extract sender email for notification purposes
	senderEmail := extractEmail(payload.Data.From)

	// Extract user's email_id from the To address
	// e.g., "ofx+lucas.tamoios@laguiar.dev" -> "ofx+lucas.tamoios"
	userEmailID := extractEmailIDFromTo(payload.Data.To, h.mailDomain)
	if userEmailID == "" {
		h.logger.Error(ctx, "Could not extract email_id from To address", "to", payload.Data.To)
		if senderEmail != "" {
			h.sendErrorEmail(ctx, senderEmail, "Endereço de destino inválido. Use seu email de importação pessoal.")
		}
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "Invalid destination address - no email_id found",
		}, w)
		return
	}

	h.logger.Info(ctx, "Looking up user by email_id", "email_id", userEmailID)

	// Find user by email_id
	user, err := h.app.AccountsService.GetUserByEmailID(ctx, accounts.GetUserByEmailIDInput{
		EmailID: userEmailID,
	})
	if err != nil {
		if stderrors.Is(err, sql.ErrNoRows) {
			h.logger.Warn(ctx, "User not found for email_id", "email_id", userEmailID)
			if senderEmail != "" {
				h.sendErrorEmail(ctx, senderEmail, "Usuário não encontrado. Verifique se o endereço de destino está correto.")
			}
		} else {
			h.logger.Error(ctx, "Failed to get user by email_id", "email_id", userEmailID, "error", err)
		}
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "User not found",
		}, w)
		return
	}

	// Use the user's registered email for all notifications from here
	userEmail := user.Email

	// Get user's organizations to find accounts
	organizations, err := h.app.AccountsService.GetOrganizationsByUser(ctx, accounts.GetOrganizationsByUserInput{
		UserID: user.UserID,
	})
	if err != nil || len(organizations) == 0 {
		h.logger.Error(ctx, "User has no organizations", "user_id", user.UserID)
		h.sendErrorEmail(ctx, userEmail, "Nenhuma organização encontrada para o usuário.")
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "No organization found",
		}, w)
		return
	}

	// Use the default organization or first one
	var organizationID int
	for _, org := range organizations {
		if org.IsDefault {
			organizationID = org.OrganizationID
			break
		}
	}
	if organizationID == 0 {
		organizationID = organizations[0].OrganizationID
	}

	// Find OFX/QFX attachments
	var ofxAttachments []ResendInboundAttachment
	for _, att := range payload.Data.Attachments {
		lowerFilename := strings.ToLower(att.Filename)
		if strings.HasSuffix(lowerFilename, ".ofx") || strings.HasSuffix(lowerFilename, ".qfx") {
			ofxAttachments = append(ofxAttachments, att)
		}
	}

	if len(ofxAttachments) == 0 {
		h.logger.Warn(ctx, "No OFX/QFX attachments found in email", "email_id", payload.Data.EmailID)
		h.sendErrorEmail(ctx, userEmail, "Nenhum arquivo OFX ou QFX encontrado no email. Anexe um arquivo .ofx ou .qfx.")
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "No OFX/QFX attachments found",
		}, w)
		return
	}

	// Parse subject line to find target account
	targetAccountName := parseSubjectForAccountName(payload.Data.Subject)

	// Get user's accounts
	isActive := true
	userAccounts, err := h.app.FinancialService.GetAccounts(ctx, financial.GetAccountsInput{
		UserID:         user.UserID,
		OrganizationID: organizationID,
		IsActive:       &isActive,
	})
	if err != nil || len(userAccounts) == 0 {
		h.logger.Error(ctx, "User has no accounts", "user_id", user.UserID)
		h.sendErrorEmail(ctx, userEmail, "Nenhuma conta encontrada. Crie uma conta no Celeiro antes de importar transações.")
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "No accounts found",
		}, w)
		return
	}

	// Find target account (by name match or use first active account)
	var targetAccount financial.Account
	if targetAccountName != "" {
		for _, acc := range userAccounts {
			if strings.EqualFold(acc.Name, targetAccountName) {
				targetAccount = acc
				break
			}
		}
	}
	if targetAccount.AccountID == 0 {
		// Use first active account
		targetAccount = userAccounts[0]
	}

	// Process each OFX attachment
	var totalImported, totalDuplicates int
	var importErrors []string

	for _, att := range ofxAttachments {
		// Get attachment content
		ofxData, err := h.getAttachmentContent(ctx, payload.Data.EmailID, att)
		if err != nil {
			h.logger.Error(ctx, "Failed to get attachment content",
				"attachment_id", att.ID,
				"filename", att.Filename,
				"error", err,
			)
			importErrors = append(importErrors, fmt.Sprintf("%s: falha ao baixar arquivo", att.Filename))
			continue
		}

		// Import transactions
		result, err := h.app.FinancialService.ImportTransactionsFromOFX(ctx, financial.ImportOFXInput{
			AccountID:      targetAccount.AccountID,
			UserID:         user.UserID,
			OrganizationID: organizationID,
			OFXData:        ofxData,
		})
		if err != nil {
			h.logger.Error(ctx, "Failed to import OFX",
				"filename", att.Filename,
				"error", err,
			)
			importErrors = append(importErrors, fmt.Sprintf("%s: %v", att.Filename, err))
			continue
		}

		totalImported += result.ImportedCount
		totalDuplicates += result.DuplicateCount

		h.logger.Info(ctx, "OFX import successful",
			"filename", att.Filename,
			"imported", result.ImportedCount,
			"duplicates", result.DuplicateCount,
		)
	}

	// Send confirmation email to the user's registered email
	h.sendConfirmationEmail(ctx, userEmail, targetAccount.Name, totalImported, totalDuplicates, importErrors)

	responses.NewSuccess(EmailInboundResponse{
		Success:        true,
		Message:        "Import completed",
		AccountName:    targetAccount.Name,
		ImportedCount:  totalImported,
		DuplicateCount: totalDuplicates,
	}, w)
}

// extractEmail extracts the email address from a "Name <email@domain.com>" format
func extractEmail(from string) string {
	// Try to extract email from angle brackets
	re := regexp.MustCompile(`<([^>]+)>`)
	matches := re.FindStringSubmatch(from)
	if len(matches) > 1 {
		return strings.ToLower(strings.TrimSpace(matches[1]))
	}

	// If no angle brackets, assume the whole string is an email
	if strings.Contains(from, "@") {
		return strings.ToLower(strings.TrimSpace(from))
	}

	return ""
}

// extractEmailIDFromTo extracts the email_id from a To address
// e.g., "ofx+lucas.tamoios@laguiar.dev" -> "ofx+lucas.tamoios"
// e.g., "u4a3b2c1d@laguiar.dev" -> "u4a3b2c1d"
func extractEmailIDFromTo(toAddresses []string, mailDomain string) string {
	mailDomainSuffix := "@" + mailDomain

	for _, to := range toAddresses {
		// Extract email from angle brackets if present
		email := extractEmail(to)
		if email == "" {
			email = strings.ToLower(strings.TrimSpace(to))
		}

		// Check if it's our inbound mail address
		if strings.HasSuffix(email, mailDomainSuffix) {
			// Extract the local part (before @)
			emailID := strings.TrimSuffix(email, mailDomainSuffix)
			return emailID
		}
	}

	return ""
}

// parseSubjectForAccountName parses the email subject to extract target account name
// Patterns:
// - "Import to Nubank" -> "Nubank"
// - "Nubank" -> "Nubank"
// - Empty or unrecognized -> ""
func parseSubjectForAccountName(subject string) string {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return ""
	}

	// Pattern: "Import to <AccountName>" or "Importar para <AccountName>"
	importToPatterns := []string{
		`(?i)import(?:ar)?\s+(?:to|para)\s+(.+)`,
		`(?i)^(.+)$`, // Fallback: use the entire subject as account name
	}

	for i, pattern := range importToPatterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(subject)
		if len(matches) > 1 {
			name := strings.TrimSpace(matches[1])
			// For the fallback pattern, only use it if it looks like an account name
			// (not too long and doesn't contain typical email subject words)
			if i == len(importToPatterns)-1 {
				if len(name) > 50 || strings.ContainsAny(strings.ToLower(name), "re:fw:fwd:") {
					return ""
				}
			}
			return name
		}
	}

	return ""
}

// getAttachmentContent retrieves the content of an attachment
func (h *Handler) getAttachmentContent(ctx context.Context, emailID string, att ResendInboundAttachment) ([]byte, error) {
	// If content is included directly (base64 encoded)
	if att.Content != "" {
		return base64.StdEncoding.DecodeString(att.Content)
	}

	// Otherwise, fetch from Resend API
	if h.resendAPIKey == "" {
		return nil, fmt.Errorf("resend API key not configured")
	}

	// Fetch attachment from Resend API (using receiving endpoint for inbound emails)
	url := fmt.Sprintf("https://api.resend.com/emails/receiving/%s/attachments/%s", emailID, att.ID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+h.resendAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch attachment: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("resend API error: %s, body: %s", resp.Status, string(body))
	}

	var attachmentResp ResendAttachmentResponse
	if err := json.NewDecoder(resp.Body).Decode(&attachmentResp); err != nil {
		return nil, fmt.Errorf("failed to decode attachment response: %w", err)
	}

	// Decode base64 content
	if attachmentResp.Content != "" {
		return base64.StdEncoding.DecodeString(attachmentResp.Content)
	}

	// If there's a download URL, fetch from there
	if attachmentResp.DownloadURL != "" {
		return h.downloadFile(ctx, attachmentResp.DownloadURL)
	}

	return nil, fmt.Errorf("no content available for attachment")
}

// downloadFile downloads a file from a URL
func (h *Handler) downloadFile(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed: %s", resp.Status)
	}

	return io.ReadAll(resp.Body)
}

// sendConfirmationEmail sends a confirmation email to the user
func (h *Handler) sendConfirmationEmail(ctx context.Context, toEmail, accountName string, imported, duplicates int, importErrors []string) {
	var body strings.Builder
	body.WriteString(fmt.Sprintf("Importacao de transacoes concluida para a conta '%s'.\n\n", accountName))
	body.WriteString(fmt.Sprintf("Transacoes importadas: %d\n", imported))
	body.WriteString(fmt.Sprintf("Transacoes duplicadas (ignoradas): %d\n", duplicates))

	if len(importErrors) > 0 {
		body.WriteString("\nErros:\n")
		for _, e := range importErrors {
			body.WriteString(fmt.Sprintf("- %s\n", e))
		}
	}

	body.WriteString("\n--\nCeleiro - Gestao Financeira")

	err := h.app.Mailer.SendPlainEmail(ctx, mailer.EmailMessage{
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Importacao OFX: %d transacoes importadas", imported),
		Body:    body.String(),
		IsHTML:  false,
	})
	if err != nil {
		h.logger.Error(ctx, "Failed to send confirmation email", "to", toEmail, "error", err)
	}
}

// sendErrorEmail sends an error notification email to the user
func (h *Handler) sendErrorEmail(ctx context.Context, toEmail, errorMessage string) {
	body := fmt.Sprintf("Nao foi possivel importar suas transacoes.\n\nMotivo: %s\n\n--\nCeleiro - Gestao Financeira", errorMessage)

	err := h.app.Mailer.SendPlainEmail(ctx, mailer.EmailMessage{
		To:      []string{toEmail},
		Subject: "Erro na importacao OFX",
		Body:    body,
		IsHTML:  false,
	})
	if err != nil {
		h.logger.Error(ctx, "Failed to send error email", "to", toEmail, "error", err)
	}
}

// verifyWebhookSignature verifies the Svix webhook signature
func (h *Handler) verifyWebhookSignature(header http.Header, payload []byte) error {
	// Get required headers
	msgID := header.Get("svix-id")
	msgTimestamp := header.Get("svix-timestamp")
	msgSignature := header.Get("svix-signature")

	if msgID == "" || msgTimestamp == "" || msgSignature == "" {
		return fmt.Errorf("missing required svix headers")
	}

	// Validate timestamp is within 5 minutes (replay protection)
	ts, err := parseTimestamp(msgTimestamp)
	if err != nil {
		return fmt.Errorf("invalid timestamp: %w", err)
	}

	now := time.Now()
	tolerance := 5 * time.Minute
	if ts.Before(now.Add(-tolerance)) || ts.After(now.Add(tolerance)) {
		return fmt.Errorf("timestamp outside tolerance window")
	}

	// Build signed payload: "{svix-id}.{svix-timestamp}.{body}"
	signedPayload := fmt.Sprintf("%s.%s.%s", msgID, msgTimestamp, string(payload))

	// Strip whsec_ prefix from secret and base64 decode it
	secret := h.resendWebhookSecret
	if strings.HasPrefix(secret, "whsec_") {
		secret = strings.TrimPrefix(secret, "whsec_")
	}

	secretBytes, err := base64.StdEncoding.DecodeString(secret)
	if err != nil {
		return fmt.Errorf("invalid webhook secret: %w", err)
	}

	// Compute HMAC-SHA256
	mac := hmac.New(sha256.New, secretBytes)
	mac.Write([]byte(signedPayload))
	expectedSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// The signature header may contain multiple signatures (v1,xxx v1,yyy)
	// We need to check if any of them match
	signatures := strings.Split(msgSignature, " ")
	for _, sig := range signatures {
		parts := strings.SplitN(sig, ",", 2)
		if len(parts) != 2 {
			continue
		}
		// parts[0] is version (e.g., "v1"), parts[1] is the signature
		if hmac.Equal([]byte(parts[1]), []byte(expectedSig)) {
			return nil
		}
	}

	return fmt.Errorf("signature verification failed")
}

// parseTimestamp parses a Unix timestamp string to time.Time
func parseTimestamp(ts string) (time.Time, error) {
	timestamp, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return time.Time{}, err
	}
	return time.Unix(timestamp, 0), nil
}

// isGmailForwardingVerification checks if the email is a Gmail forwarding verification request
func isGmailForwardingVerification(from, subject string) bool {
	fromLower := strings.ToLower(from)
	subjectLower := strings.ToLower(subject)

	return strings.Contains(fromLower, "forwarding-noreply@google.com") &&
		(strings.Contains(subjectLower, "confirmação de encaminhamento") ||
			strings.Contains(subjectLower, "forwarding confirmation") ||
			strings.Contains(subjectLower, "gmail forwarding"))
}

// extractGmailForwardingRequester extracts the email address that requested forwarding
// from the verification email text. Example text:
// "lucas.tamoios@gmail.com pediu para encaminhar e-mails automaticamente"
func extractGmailForwardingRequester(text string) string {
	// Pattern matches email at the start of the text or after common phrases
	patterns := []string{
		`^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+(?:pediu|requested|has requested)`,
		`([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+(?:pediu|requested|has requested)`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			return strings.ToLower(matches[1])
		}
	}

	return ""
}

// extractGmailVerificationURL extracts the verification URL from the email text
func extractGmailVerificationURL(text string) string {
	// Look for the confirmation URL pattern
	// URL format: https://mail-settings.google.com/mail/vf-[token]-[suffix]
	re := regexp.MustCompile(`(https://mail-settings\.google\.com/mail/vf-[^\s]+)`)
	matches := re.FindStringSubmatch(text)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// handleGmailForwardingVerification handles automatic confirmation of Gmail forwarding
func (h *Handler) handleGmailForwardingVerification(ctx context.Context, email ResendInboundEmail, w http.ResponseWriter) {
	h.logger.Info(ctx, "Detected Gmail forwarding verification email")

	// Extract the requester's email from the email text
	requesterEmail := extractGmailForwardingRequester(email.Text)
	if requesterEmail == "" {
		h.logger.Warn(ctx, "Could not extract requester email from Gmail verification")
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "Could not extract requester email",
		}, w)
		return
	}

	h.logger.Info(ctx, "Gmail forwarding requested by", "requester_email", requesterEmail)

	// Check if the requester is a registered user
	_, err := h.app.AccountsService.GetUserByEmail(ctx, accounts.GetUserByEmailInput{
		Email: requesterEmail,
	})
	if err != nil {
		h.logger.Warn(ctx, "Gmail forwarding requester is not a registered user",
			"requester_email", requesterEmail,
			"error", err,
		)
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "Requester is not a registered user",
		}, w)
		return
	}

	// Extract the verification URL
	verificationURL := extractGmailVerificationURL(email.Text)
	if verificationURL == "" {
		h.logger.Error(ctx, "Could not extract verification URL from Gmail email")
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: "Could not extract verification URL",
		}, w)
		return
	}

	h.logger.Info(ctx, "Confirming Gmail forwarding", "url", verificationURL)

	// Make GET request to confirm the forwarding
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Get(verificationURL)
	if err != nil {
		h.logger.Error(ctx, "Failed to confirm Gmail forwarding", "error", err)
		responses.NewSuccess(EmailInboundResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to confirm: %v", err),
		}, w)
		return
	}
	defer resp.Body.Close()

	h.logger.Info(ctx, "Gmail forwarding confirmation response",
		"status", resp.StatusCode,
		"requester_email", requesterEmail,
	)

	responses.NewSuccess(EmailInboundResponse{
		Success: true,
		Message: fmt.Sprintf("Gmail forwarding confirmed for %s", requesterEmail),
	}, w)
}
