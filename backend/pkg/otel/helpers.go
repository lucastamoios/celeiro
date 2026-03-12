package otel

import (
	"context"
	"fmt"
	"net/http"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

// RecordErrorOnSpan records an error on a span if err is not nil.
func RecordErrorOnSpan(span trace.Span, err error) {
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		if stack := getStackTrace(err); stack != "" {
			span.SetAttributes(attribute.String("exception.stacktrace", stack))
		}
	}
}

// InjectTraceHeaders propagates the current trace context into outgoing HTTP request headers.
func InjectTraceHeaders(ctx context.Context, header http.Header) {
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(header))
}

// GetTraceIDFromContext extracts the trace ID from the current span in context.
func GetTraceIDFromContext(ctx context.Context) string {
	span := trace.SpanFromContext(ctx)
	if span == nil {
		return ""
	}
	spanCtx := span.SpanContext()
	if !spanCtx.HasTraceID() {
		return ""
	}
	return spanCtx.TraceID().String()
}

func getStackTrace(err error) string {
	if err == nil {
		return ""
	}
	formatted := fmt.Sprintf("%+v", err)
	if formatted == err.Error() {
		return ""
	}
	return formatted
}
