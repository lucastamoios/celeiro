package mailer

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/logging"
)

type LocalMailer struct {
	config    *config.Config
	logger    logging.Logger
	outputDir string
	testError error
}

type EmailRecord struct {
	Timestamp time.Time            `json:"timestamp"`
	Message   EmailTemplateMessage `json:"message"`
	Status    string               `json:"status"`
}

func NewLocalMailer(config *config.Config, logger logging.Logger) Mailer {
	outputDir := filepath.Join(".", "localmailer")
	if dir := os.Getenv("LOCAL_MAILER_DIR"); dir != "" {
		outputDir = filepath.Join(".", dir)
	}

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		logger.Error(context.Background(), "Could not create email output directory", "outputDir", outputDir, "error", err)
	}

	return &LocalMailer{
		config:    config,
		logger:    logger,
		outputDir: outputDir,
	}
}

func (l *LocalMailer) SendEmail(ctx context.Context, message EmailTemplateMessage) error {
	if l.testError != nil {
		return l.testError
	}

	l.logger.Info(ctx, "LOCAL MAILER", "from", l.config.EmailFrom, "to", strings.Join(message.To, ", "), "subject", message.Subject, "template", message.Template)
	if err := l.saveEmailToFile(message); err != nil {
		l.logger.Error(ctx, "Failed to save email to file", "error", err)
	}

	l.logger.Info(ctx, "Email saved", "outputDir", l.outputDir)
	return nil
}

func (l *LocalMailer) saveEmailToFile(message EmailTemplateMessage) error {
	timestamp := time.Now()

	recipient := "unknown"
	if len(message.To) > 0 {
		recipient = strings.ReplaceAll(message.To[0], "@", "_at_")
		recipient = strings.ReplaceAll(recipient, ".", "_")
	}

	filename := fmt.Sprintf("%s_%s.json",
		timestamp.Format("20060102_150405"),
		recipient)

	filepath := filepath.Join(l.outputDir, filename)

	record := EmailRecord{
		Timestamp: timestamp,
		Message:   message,
		Status:    "sent",
	}

	data, err := json.MarshalIndent(record, "", "  ")
	if err != nil {
		return errors.Wrap(err, "failed to marshal email record")
	}

	if err := os.WriteFile(filepath, data, 0644); err != nil {
		return errors.Wrap(err, "failed to write email file")
	}

	return nil
}

func (l *LocalMailer) GetSentEmails() ([]EmailRecord, error) {
	files, err := filepath.Glob(filepath.Join(l.outputDir, "*.json"))
	if err != nil {
		return nil, errors.Wrap(err, "failed to list email files")
	}

	var records []EmailRecord
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			l.logger.Error(context.Background(), "Failed to read email file", "file", file, "error", err)
			continue
		}

		var record EmailRecord
		if err := json.Unmarshal(data, &record); err != nil {
			l.logger.Error(context.Background(), "Failed to parse email file", "file", file, "error", err)
			continue
		}

		records = append(records, record)
	}

	return records, nil
}

func (l *LocalMailer) ClearSentEmails() error {
	files, err := filepath.Glob(filepath.Join(l.outputDir, "*.json"))
	if err != nil {
		return errors.Wrap(err, "failed to list email files")
	}

	for _, file := range files {
		if err := os.Remove(file); err != nil {
			l.logger.Error(context.Background(), "Failed to remove email file", "file", file, "error", err)
		}
	}

	return nil
}

func (l *LocalMailer) SetTestError(err error) {
	l.testError = err
}
