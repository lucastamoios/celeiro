package mailer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/catrutech/celeiro/pkg/logging"
)

type SMTP2GOProvider struct {
	apiKey        string
	baseURL       string
	defaultSender string
	httpClient    *http.Client
	logger        logging.Logger
}

type SMTP2GOConfig struct {
	APIKey        string
	DefaultSender string
	BaseURL       string
	Timeout       time.Duration
}

type SMTP2GOPayload struct {
	Sender   string   `json:"sender"`
	To       []string `json:"to"`
	Subject  string   `json:"subject"`
	TextBody string   `json:"text_body,omitempty"`
	HTMLBody string   `json:"html_body,omitempty"`
	CC       []string `json:"cc,omitempty"`
	BCC      []string `json:"bcc,omitempty"`
}

type SMTP2GOResponse struct {
	RequestID string                 `json:"request_id"`
	Data      SMTP2GOResponseData    `json:"data"`
	Errors    []SMTP2GOResponseError `json:"errors,omitempty"`
}

type SMTP2GOResponseData struct {
	EmailID   string                   `json:"email_id"`
	Succeeded int                      `json:"succeeded"`
	Failed    int                      `json:"failed"`
	Failures  []SMTP2GOResponseFailure `json:"failures,omitempty"`
}

type SMTP2GOResponseError struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}

type SMTP2GOResponseFailure struct {
	EmailAddress string `json:"email_address"`
	Message      string `json:"message"`
}

func NewSMTP2GOProvider(config SMTP2GOConfig, logger logging.Logger) *SMTP2GOProvider {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://api.smtp2go.com/v3"
	}

	timeout := config.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	return &SMTP2GOProvider{
		apiKey:        config.APIKey,
		baseURL:       baseURL,
		defaultSender: config.DefaultSender,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		logger: logger,
	}
}

func (s *SMTP2GOProvider) SendEmail(ctx context.Context, message EmailTemplateMessage) error {
	emailMessage, err := BuildEmailFromTemplate(message)
	if err != nil {
		return fmt.Errorf("failed to build email from template: %w", err)
	}

	return s.sendEmailMessage(ctx, emailMessage)
}

func (s *SMTP2GOProvider) sendEmailMessage(ctx context.Context, email EmailMessage) error {
	payload := SMTP2GOPayload{
		Sender:  s.defaultSender,
		To:      email.To,
		Subject: email.Subject,
	}

	if email.IsHTML {
		payload.HTMLBody = email.Body
	} else {
		payload.TextBody = email.Body
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	requestURL := s.baseURL + "/email/send"
	s.logger.Info(ctx, "Making SMTP2GO API request",
		"url", requestURL,
		"method", "POST",
		"base_url", s.baseURL)

	req, err := http.NewRequestWithContext(ctx, "POST", requestURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Smtp2go-Api-Key", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		s.logger.Error(ctx, "Network error while sending email", "error", err)
		return fmt.Errorf("network error: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	s.logger.Info(ctx, "SMTP2GO API response",
		"status_code", resp.StatusCode,
		"response_body", string(responseBody),
		"content_type", resp.Header.Get("Content-Type"))

	var apiResponse SMTP2GOResponse
	if err := json.Unmarshal(responseBody, &apiResponse); err != nil {
		s.logger.Error(ctx, "Failed to parse JSON response",
			"error", err,
			"response_body", string(responseBody),
			"status_code", resp.StatusCode)
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if resp.StatusCode == 200 {
		if len(apiResponse.Errors) > 0 {
			errorMsg := "SMTP2GO API errors: "
			for _, apiErr := range apiResponse.Errors {
				errorMsg += fmt.Sprintf("%s (%s); ", apiErr.Message, apiErr.Code)
			}
			s.logger.Error(ctx, "Failed to send email", "errors", apiResponse.Errors)
			return fmt.Errorf(errorMsg)
		}

		if apiResponse.Data.Failed > 0 {
			errorMsg := "Failed to send to some recipients: "
			for _, failure := range apiResponse.Data.Failures {
				errorMsg += fmt.Sprintf("%s (%s); ", failure.EmailAddress, failure.Message)
			}
			s.logger.Error(ctx, "Some emails failed to send", "failures", apiResponse.Data.Failures)
			return fmt.Errorf(errorMsg)
		}

		s.logger.Info(ctx, "Email sent successfully",
			"email_id", apiResponse.Data.EmailID,
			"succeeded", apiResponse.Data.Succeeded,
			"to", payload.To,
			"subject", payload.Subject)
		return nil
	}

	errorMsg := fmt.Sprintf("HTTP %d", resp.StatusCode)
	if len(apiResponse.Errors) > 0 {
		errorMsg = apiResponse.Errors[0].Message
	}

	s.logger.Error(ctx, "Failed to send email",
		"status_code", resp.StatusCode,
		"error", errorMsg,
		"errors", apiResponse.Errors)

	return fmt.Errorf("SMTP2GO API error: %s", errorMsg)
}
