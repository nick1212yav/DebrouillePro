/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE OBSERVABILITY — TRACING ENGINE (WORLD #1 FINAL)            */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/observability/tracing.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Lightweight distributed tracing                                       */
/*   - Span hierarchy                                                         */
/*   - Correlation IDs                                                        */
/*   - Latency measurement                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startedAt: number;
}

export interface Span {
  context: TraceContext;
  name: string;
  tags?: Record<string, string>;
  endedAt?: number;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

const activeSpans = new Map<string, Span>();

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

const generateId = (): string =>
  crypto.randomBytes(8).toString("hex");

/* -------------------------------------------------------------------------- */
/* TRACE CREATION                                                             */
/* -------------------------------------------------------------------------- */

export const startTrace = (
  name: string,
  tags?: Record<string, string>
): TraceContext => {
  const traceId = generateId();
  const spanId = generateId();

  const context: TraceContext = {
    traceId,
    spanId,
    startedAt: Date.now(),
  };

  activeSpans.set(spanId, {
    context,
    name,
    tags,
  });

  logger.debug("🧵 Trace started", {
    traceId,
    spanId,
    name,
  });

  return context;
};

/* -------------------------------------------------------------------------- */
/* CHILD SPANS                                                                */
/* -------------------------------------------------------------------------- */

export const startSpan = (
  parent: TraceContext,
  name: string,
  tags?: Record<string, string>
): TraceContext => {
  const spanId = generateId();

  const context: TraceContext = {
    traceId: parent.traceId,
    spanId,
    parentSpanId: parent.spanId,
    startedAt: Date.now(),
  };

  activeSpans.set(spanId, {
    context,
    name,
    tags,
  });

  logger.debug("🧵 Span started", {
    traceId: context.traceId,
    spanId,
    parentSpanId: context.parentSpanId,
    name,
  });

  return context;
};

/* -------------------------------------------------------------------------- */
/* FINISH SPAN                                                                */
/* -------------------------------------------------------------------------- */

export const finishSpan = (
  context: TraceContext,
  error?: unknown
) => {
  const span = activeSpans.get(context.spanId);
  if (!span) return;

  span.endedAt = Date.now();
  activeSpans.delete(context.spanId);

  const duration =
    span.endedAt - span.context.startedAt;

  logger.debug("🧵 Span finished", {
    traceId: context.traceId,
    spanId: context.spanId,
    name: span.name,
    durationMs: duration,
    error: error
      ? String(error)
      : undefined,
  });
};
