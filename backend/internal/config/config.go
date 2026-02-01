package config

import (
	"flag"
	"log/slog"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment       string // "development" or "production"
	PGConnStr         string
	PGMaxIdle         int
	PGMaxConn         int
	PGDBName          string
	Port              int
	Logger            *slog.Logger
	EmailFrom         string
	RedisHost         string
	RedisPort         string
	RedisPassword     string
	RedisDB           int
	ServiceName       string
	ServiceInstanceID string
	ServiceVersion    string
	OTELEndpoint      string
	OTELEnabled       bool
	MailerType        string
	SMTP2GO           SMTP2GOConfig
	Resend            ResendConfig
	FrontendURL       string // Base URL for frontend (used in email links)
	MailDomain        string // Domain for inbound email parsing (e.g., "mail.celeiro.catru.tech")
	GoogleOAuth       GoogleOAuthConfig
}

type GoogleOAuthConfig struct {
	ClientID string
}

func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

type SMTP2GOConfig struct {
	APIKey        string
	DefaultSender string
	BaseURL       string
	Timeout       time.Duration
}

type ResendConfig struct {
	APIKey        string
	WebhookSecret string
}

func New() *Config {
	environment := flag.String("environment", getEnvAsString("ENVIRONMENT", "development"), "Environment (development or production)")
	port := flag.Int("port", getEnvAsInt("PORT", 8080), "Port to run the server on")
	pgMaxIdle := flag.Int("pg-max-idle", getEnvAsInt("PG_MAX_IDLE", 10), "Maximum idle PostgreSQL connections")
	pgMaxConn := flag.Int("pg-max-conn", getEnvAsInt("PG_MAX_CONN", 100), "Maximum PostgreSQL connections")
	pgConnStr := flag.String("database-url", getEnvAsString("DATABASE_URL", ""), "PostgreSQL connection string")
	pgDBName := flag.String("database-name", getEnvAsString("DATABASE_NAME", ""), "PostgreSQL database name")
	redisHost := flag.String("redis-host", getEnvAsString("REDIS_HOST", ""), "Redis host")
	redisPort := flag.String("redis-port", getEnvAsString("REDIS_PORT", ""), "Redis port")
	redisPassword := flag.String("redis-password", getEnvAsString("REDIS_PASSWORD", ""), "Redis password")
	redisDB := flag.Int("redis-db", getEnvAsInt("REDIS_DB", 0), "Redis database")
	emailFrom := flag.String("email-from", getEnvAsString("EMAIL_FROM", "noreply@example.com"), "Email from")
	serviceName := flag.String("service-name", getEnvAsString("SERVICE_NAME", "scaffold"), "Service name")
	serviceInstanceID := flag.String("service-instance-id", getEnvAsString("SERVICE_INSTANCE_ID", "1"), "Service instance ID")
	serviceVersion := flag.String("service-version", getEnvAsString("SERVICE_VERSION", "unknown"), "Service version")
	otelEndpoint := flag.String("otel-endpoint", getEnvAsString("OTEL_ENDPOINT", "localhost:4317"), "OTEL endpoint")
	otelEnabled := flag.Bool("otel-enabled", getEnvAsBool("OTEL_ENABLED", true), "Enable OTEL metrics and tracing")
	mailerType := flag.String("mailer-type", getEnvAsString("MAILER_TYPE", "local"), "Mailer type")

	smtp2goAPIKey := flag.String("smtp2go-api-key", getEnvAsString("SMTP2GO_API_KEY", ""), "SMTP2GO API key")
	smtp2goSender := flag.String("smtp2go-sender", getEnvAsString("SMTP2GO_SENDER", ""), "SMTP2GO default sender")
	smtp2goBaseURL := flag.String("smtp2go-base-url", getEnvAsString("SMTP2GO_BASE_URL", ""), "SMTP2GO base URL")
	smtp2goTimeout := flag.Int("smtp2go-timeout", getEnvAsInt("SMTP2GO_TIMEOUT", 30), "SMTP2GO timeout in seconds")
	resendAPIKey := flag.String("resend-api-key", getEnvAsString("RESEND_API_KEY", ""), "Resend API key")
	resendWebhookSecret := flag.String("resend-webhook-secret", getEnvAsString("RESEND_WEBHOOK_SECRET", ""), "Resend webhook signing secret")
	frontendURL := flag.String("frontend-url", getEnvAsString("FRONTEND_URL", "http://localhost:51111"), "Frontend base URL for email links")
	mailDomain := flag.String("mail-domain", getEnvAsString("MAIL_DOMAIN", "mail.celeiro.catru.tech"), "Domain for inbound email parsing")
	googleClientID := flag.String("google-client-id", getEnvAsString("GOOGLE_CLIENT_ID", ""), "Google OAuth Client ID")

	flag.Parse()

	return &Config{
		Environment:       *environment,
		Port:              *port,
		PGConnStr:         *pgConnStr,
		PGMaxIdle:         *pgMaxIdle,
		PGMaxConn:         *pgMaxConn,
		PGDBName:          *pgDBName,
		EmailFrom:         *emailFrom,
		RedisHost:         *redisHost,
		RedisPort:         *redisPort,
		RedisPassword:     *redisPassword,
		RedisDB:           *redisDB,
		ServiceName:       *serviceName,
		ServiceInstanceID: *serviceInstanceID,
		ServiceVersion:    *serviceVersion,
		OTELEndpoint:      *otelEndpoint,
		OTELEnabled:       *otelEnabled,
		MailerType:        *mailerType,
		SMTP2GO: SMTP2GOConfig{
			APIKey:        *smtp2goAPIKey,
			DefaultSender: *smtp2goSender,
			BaseURL:       *smtp2goBaseURL,
			Timeout:       time.Duration(*smtp2goTimeout) * time.Second,
		},
		Resend: ResendConfig{
			APIKey:        *resendAPIKey,
			WebhookSecret: *resendWebhookSecret,
		},
		FrontendURL: *frontendURL,
		MailDomain:  *mailDomain,
		GoogleOAuth: GoogleOAuthConfig{
			ClientID: *googleClientID,
		},
	}
}

func getEnvAsInt(name string, defaultValue int) int {
	valueStr := os.Getenv(name)
	if valueStr == "" {
		return defaultValue
	}

	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}

	return defaultValue
}

func getEnvAsString(name string, defaultValue string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsBool(name string, defaultValue bool) bool {
	valueStr := os.Getenv(name)
	if valueStr == "" {
		return defaultValue
	}

	// Accept common boolean representations
	switch valueStr {
	case "true", "1", "yes", "on":
		return true
	case "false", "0", "no", "off":
		return false
	}

	return defaultValue
}
