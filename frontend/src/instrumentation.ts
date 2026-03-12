import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_ENDPOINT;

export function initTelemetry() {
  if (!OTEL_ENDPOINT) {
    console.log('[OTel] No VITE_OTEL_ENDPOINT set, skipping instrumentation');
    return;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'celeiro-frontend',
  });

  const exporter = new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
  });

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  const apiBase = import.meta.env.VITE_API_URL || window.location.origin;

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [new RegExp(apiBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))],
        clearTimingResources: true,
      }),
      new DocumentLoadInstrumentation(),
    ],
  });

  // Capture unhandled errors as span events
  window.addEventListener('error', (event) => {
    const tracer = provider.getTracer('celeiro-frontend');
    const span = tracer.startSpan('browser.error');
    span.setAttribute('error.message', event.message);
    span.setAttribute('error.filename', event.filename || 'unknown');
    span.setAttribute('error.lineno', event.lineno || 0);
    span.setStatus({ code: 2, message: event.message });
    span.end();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const tracer = provider.getTracer('celeiro-frontend');
    const span = tracer.startSpan('browser.unhandled_rejection');
    const message = event.reason?.message || String(event.reason);
    span.setAttribute('error.message', message);
    span.setStatus({ code: 2, message });
    span.end();
  });

  console.log(`[OTel] Frontend instrumentation initialized → ${OTEL_ENDPOINT}`);
}
