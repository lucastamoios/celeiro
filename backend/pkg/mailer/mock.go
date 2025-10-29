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
