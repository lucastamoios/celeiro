package logging

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/pkg/errors"

	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.30.0"
)

type Logger interface {
	Debug(ctx context.Context, msg string, args ...any)
	Info(ctx context.Context, msg string, args ...any)
	Warn(ctx context.Context, msg string, args ...any)
	Error(ctx context.Context, msg string, args ...any)
}

type TestLogger struct {
	ShowStackTrace bool
}

func (l *TestLogger) Debug(ctx context.Context, msg string, args ...any) {
	l.print("DEBUG", msg, args...)
}

func (l *TestLogger) Info(ctx context.Context, msg string, args ...any) {
	l.print("INFO", msg, args...)
}

func (l *TestLogger) Warn(ctx context.Context, msg string, args ...any) {
	l.print("WARN", msg, args...)
}

func (l *TestLogger) Error(ctx context.Context, msg string, args ...any) {
	l.print("ERROR", msg, args...)
	if !l.ShowStackTrace {
		return
	}
	for i := 0; i < len(args); i += 2 {
		if i+1 < len(args) && args[i] == "error" {
			e, ok := args[i+1].(errors.StackError)
			if ok {
				fmt.Println(string(e.Stack()))
				break
			}
		}
	}
}

func (l *TestLogger) SetShowStackTrace() {
	l.ShowStackTrace = true
}

func (l *TestLogger) print(level string, msg string, args ...any) {
	// Print in a readable, test-friendly format: LEVEL: message | key1=val1 key2=val2 ...
	out := level + ": " + msg
	if len(args) > 0 {
		out += " |"
		for i := 0; i < len(args); i += 2 {
			if i+1 < len(args) {
				out += " " + toString(args[i]) + "=" + toString(args[i+1])
			} else {
				out += " " + toString(args[i])
			}
		}
	}
	println(out)
}

func toString(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case error:
		return t.Error()
	default:
		return fmt.Sprintf("%v", t)
	}
}

type otelLogger struct {
	slog.Logger
}

func (l *otelLogger) Debug(ctx context.Context, msg string, args ...any) {
	l.DebugContext(ctx, msg, args...)
}

func (l *otelLogger) Info(ctx context.Context, msg string, args ...any) {
	l.InfoContext(ctx, msg, args...)
}

func (l *otelLogger) Warn(ctx context.Context, msg string, args ...any) {
	l.WarnContext(ctx, msg, args...)
}

func (l *otelLogger) Error(ctx context.Context, msg string, args ...any) {
	attrs := handleError(args)
	l.ErrorContext(ctx, msg, attrs...)
}

func NewOTelLogger(config *config.Config) (Logger, error) {
	// Set resource attributes
	res, _ := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(config.ServiceName),
			semconv.ServiceInstanceID(config.ServiceInstanceID),
			semconv.ServiceVersion(config.ServiceVersion),
		),
	)
	// Propagate trace context and baggage
	prop := propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	)
	otel.SetTextMapPropagator(prop)

	// Export logs to OTLP
	logExporter, err := otlploghttp.New(
		context.Background(),
		otlploghttp.WithInsecure(),
		otlploghttp.WithEndpoint(config.OTELEndpoint),
	)
	if err != nil {
		return nil, err
	}
	processor := log.NewBatchProcessor(logExporter)
	loggerProvider := log.NewLoggerProvider(
		log.WithResource(res),
		log.WithProcessor(processor),
	)
	// should we call loggerProvider.Shutdown?
	logger := otelslog.NewLogger(semconv.SchemaURL, otelslog.WithLoggerProvider(loggerProvider))
	return &otelLogger{*logger}, nil
}

func NewStdoutLogger() (Logger, error) {
	opts := &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}
	logger := slog.New(slog.NewTextHandler(os.Stdout, opts))
	return &otelLogger{*logger}, nil
}

func handleError(args []any) []any {
	var attrs []any

	for i := 0; i < len(args); i += 2 {
		if i+1 >= len(args) {
			// Odd number of args, add the last one as-is
			attrs = append(attrs, args[i])
			break
		}

		key := args[i]
		value := args[i+1]

		// Check if key is "error" and value implements StackError
		if keyStr, ok := key.(string); ok && keyStr == "error" {
			if stackErr, ok := value.(errors.StackError); ok {
				// Separate into error message and stack trace
				attrs = append(attrs, "error", stackErr.Error())
				attrs = append(attrs, "stack", string(stackErr.Stack()))
			} else {
				// Regular error or other value
				attrs = append(attrs, key, value)
			}
		} else {
			// Not an error key, add as-is
			attrs = append(attrs, key, value)
		}
	}

	return attrs
}
