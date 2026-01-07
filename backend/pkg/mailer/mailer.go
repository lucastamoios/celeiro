package mailer

import (
	"context"
)

type EmailMessage struct {
	To      []string
	Subject string
	Body    string
	IsHTML  bool
}

type EmailTemplateMessage struct {
	To       []string
	Subject  string
	Template TemplateName
	Data     map[string]any
}

type Mailer interface {
	SendEmail(ctx context.Context, message EmailTemplateMessage) error
	SendPlainEmail(ctx context.Context, message EmailMessage) error
}

func BuildEmailFromTemplate(tplMsg EmailTemplateMessage) (EmailMessage, error) {
	filename, err := GetTemplateFilename(tplMsg.Template)
	if err != nil {
		return EmailMessage{}, err
	}

	htmlBody, err := RenderTemplateToString(filename, tplMsg.Data)
	if err != nil {
		return EmailMessage{}, err
	}

	return EmailMessage{
		To:      tplMsg.To,
		Subject: tplMsg.Subject,
		Body:    htmlBody,
		IsHTML:  true,
	}, nil
}
