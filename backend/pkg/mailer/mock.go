package mailer

import (
	"context"
	"log"
	"strings"
)

type MockMailer struct{}

func NewMockMailer() *MockMailer {
	return &MockMailer{}
}

func (m *MockMailer) SendEmail(ctx context.Context, message EmailTemplateMessage) error {
	log.Printf("📧 MOCK MAILER 📧")
	log.Printf("To: %s", strings.Join(message.To, ", "))
	log.Printf("Subject: %s", message.Subject)
	log.Printf("Template: %s", message.Template)
	log.Printf("Data: %+v", message.Data)
	return nil
}

func (m *MockMailer) SendPlainEmail(ctx context.Context, message EmailMessage) error {
	log.Printf("📧 MOCK MAILER (Plain) 📧")
	log.Printf("To: %s", strings.Join(message.To, ", "))
	log.Printf("Subject: %s", message.Subject)
	log.Printf("Body: %s", message.Body)
	log.Printf("IsHTML: %v", message.IsHTML)
	return nil
}
