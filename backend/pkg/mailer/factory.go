package mailer

import (
	"context"
	"strings"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/pkg/logging"
)

type MailerType string

const (
	MockMailerType    MailerType = "mock"
	LocalMailerType   MailerType = "local"
	SMTP2GOMailerType MailerType = "smtp2go"
	ResendMailerType  MailerType = "resend"
)

func GetMailerType(config *config.Config) MailerType {
	// If a specific mailer type is set, use it
	switch strings.ToLower(config.MailerType) {
	case string(MockMailerType):
		return MockMailerType
	case string(SMTP2GOMailerType):
		return SMTP2GOMailerType
	case string(ResendMailerType):
		return ResendMailerType
	case string(LocalMailerType):
		return LocalMailerType
	}

	// Auto-select based on environment:
	// - Production: use Resend
	// - Development: use LocalMailer
	if config.IsProduction() {
		return ResendMailerType
	}
	return LocalMailerType
}

func NewMailer(mailerType MailerType, config *config.Config, logger logging.Logger) Mailer {
	switch strings.ToLower(string(mailerType)) {
	case string(MockMailerType):
		return NewMockMailer()
	case string(LocalMailerType):
		return NewLocalMailer(config, logger)
	case string(SMTP2GOMailerType):
		return NewSMTP2GOMailer(config, logger)
	case string(ResendMailerType):
		return NewResendMailer(config, logger)
	default:
		logger.Error(context.Background(), "Invalid mailer type", "mailerType", mailerType)
		return nil
	}
}

func NewSMTP2GOMailer(config *config.Config, logger logging.Logger) Mailer {
	smtp2goConfig := SMTP2GOConfig{
		APIKey:        config.SMTP2GO.APIKey,
		DefaultSender: config.SMTP2GO.DefaultSender,
		BaseURL:       config.SMTP2GO.BaseURL,
		Timeout:       config.SMTP2GO.Timeout,
	}
	return NewSMTP2GOProvider(smtp2goConfig, logger)
}

func NewResendMailer(config *config.Config, logger logging.Logger) Mailer {
	resendConfig := ResendConfig{
		APIKey:        config.Resend.APIKey,
		DefaultSender: config.EmailFrom,
	}
	return NewResendProvider(resendConfig, logger)
}
