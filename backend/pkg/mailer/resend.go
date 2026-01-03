package mailer

import (
	"context"

	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/resend/resend-go/v2"
)

type ResendConfig struct {
	APIKey        string
	DefaultSender string
}

type ResendProvider struct {
	client *resend.Client
	config ResendConfig
	logger logging.Logger
}

func NewResendProvider(config ResendConfig, logger logging.Logger) *ResendProvider {
	client := resend.NewClient(config.APIKey)

	return &ResendProvider{
		client: client,
		config: config,
		logger: logger,
	}
}

func (r *ResendProvider) SendEmail(ctx context.Context, message EmailTemplateMessage) error {
	emailMessage, err := BuildEmailFromTemplate(message)
	if err != nil {
		return err
	}

	sender := r.config.DefaultSender
	if sender == "" {
		sender = "Celeiro <noreply@mail.celeiro.catru.tech>"
	}

	params := &resend.SendEmailRequest{
		From:    sender,
		To:      emailMessage.To,
		Subject: emailMessage.Subject,
		Html:    emailMessage.Body,
	}

	sent, err := r.client.Emails.Send(params)
	if err != nil {
		r.logger.Error(ctx, "Failed to send email via Resend",
			"error", err,
			"to", emailMessage.To,
			"subject", emailMessage.Subject,
		)
		return err
	}

	r.logger.Info(ctx, "Email sent via Resend",
		"email_id", sent.Id,
		"to", emailMessage.To,
		"subject", emailMessage.Subject,
	)

	return nil
}
