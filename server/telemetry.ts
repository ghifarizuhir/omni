// OpenTelemetry scaffold.
//
// Strategy: we depend only on `@opentelemetry/api`, which is the stable
// instrumentation surface. A real exporter (OTLP, Honeycomb, Datadog) gets
// installed and registered in `initTelemetry` once a backend is chosen; until
// then `trace.getTracer(…)` returns a no-op tracer and the spans are dropped
// silently. This means instrumentation can be sprinkled through the codebase
// today without committing to a vendor.
//
// To turn it on:
//   1. Install `@opentelemetry/sdk-node`, an exporter, and the desired
//      instrumentations.
//   2. Replace the body of `initTelemetry` with the SDK bootstrap, e.g.:
//        const sdk = new NodeSDK({ traceExporter, instrumentations: [...] });
//        sdk.start();
//   3. Set OTEL_EXPORTER_OTLP_ENDPOINT in the environment.

import { trace, type Tracer } from '@opentelemetry/api';

let started = false;

export const initTelemetry = (): void => {
  if (started) return;
  started = true;
  // No SDK registered yet — spans created via getTracer() are no-ops.
  // Hook here to register the chosen SDK + exporter before the first span.
};

export const getTracer = (name = 'ois.server'): Tracer => trace.getTracer(name);

// Small helper to instrument a function with a span. Use:
//   await withSpan('repo.cmdb.listCIs', () => cmdbRepo.listCIs(tenantId));
export const withSpan = async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn();
      span.end();
      return result;
    } catch (e) {
      span.recordException(e as Error);
      span.setStatus({ code: 2, message: (e as Error).message }); // SpanStatusCode.ERROR = 2
      span.end();
      throw e;
    }
  });
};
