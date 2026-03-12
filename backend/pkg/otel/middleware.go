package otel

import (
	"encoding/hex"
	"net/http"

	"github.com/go-chi/chi/v5"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// ChiTraceMiddleware creates a chi middleware that traces HTTP requests.
func ChiTraceMiddleware(provider *Provider) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := provider.ExtractContext(r.Context(), r.Header)

			routePattern := chi.RouteContext(r.Context()).RoutePattern()
			if routePattern == "" {
				routePattern = "unknown"
			}

			spanName := r.Method + " " + routePattern

			ctx, span := provider.StartTrace(ctx, spanName, trace.WithSpanKind(trace.SpanKindServer))
			defer span.End()

			span.SetAttributes(
				attribute.String("http.method", r.Method),
				attribute.String("http.route", routePattern),
				attribute.String("http.target", r.URL.Path),
				attribute.String("http.host", r.Host),
				attribute.String("http.user_agent", r.UserAgent()),
			)

			// Server-Timing header for trace correlation
			w.Header().Set("Access-Control-Expose-Headers", "Server-Timing")
			spanCtx := span.SpanContext()
			traceID := spanCtx.TraceID()
			hexTraceID := hex.EncodeToString(traceID[:])
			spanID := spanCtx.SpanID()
			hexSpanID := hex.EncodeToString(spanID[:])
			w.Header().Set("Server-Timing", "traceparent;desc=\"00-"+hexTraceID+"-"+hexSpanID+"-01\"")

			ww := &statusWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(ww, r.WithContext(ctx))

			span.SetAttributes(attribute.Int("http.status_code", ww.statusCode))
			if ww.statusCode >= 400 {
				span.SetStatus(codes.Error, http.StatusText(ww.statusCode))
			}
		})
	}
}

type statusWriter struct {
	http.ResponseWriter
	statusCode int
}

func (sw *statusWriter) WriteHeader(statusCode int) {
	sw.statusCode = statusCode
	sw.ResponseWriter.WriteHeader(statusCode)
}
