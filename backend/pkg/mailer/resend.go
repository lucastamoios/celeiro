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

	params := &resend.SendEmailRequest{
		From:    r.config.DefaultSender,
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

func (r *ResendProvider) SendPlainEmail(ctx context.Context, message EmailMessage) error {
	params := &resend.SendEmailRequest{
		From:    r.config.DefaultSender,
		To:      message.To,
		Subject: message.Subject,
	}

	if message.IsHTML {
		params.Html = message.Body
	} else {
		params.Text = message.Body
	}

	sent, err := r.client.Emails.Send(params)
	if err != nil {
		r.logger.Error(ctx, "Failed to send plain email via Resend",
			"error", err,
			"to", message.To,
			"subject", message.Subject,
		)
		return err
	}

	r.logger.Info(ctx, "Plain email sent via Resend",
		"email_id", sent.Id,
		"to", message.To,
		"subject", message.Subject,
	)

	return nil
}
