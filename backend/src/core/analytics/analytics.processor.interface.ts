/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — PROCESSOR INTERFACE                                     */
/*  File: core/analytics/analytics.processor.interface.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  ⚙️ Atomic Processor • Observable • AI Ready                                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  AnalyticsEvent,
  AnalyticsProcessingMode,
  EpochMillis,
} from "./analytics.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class AnalyticsProcessorError extends Error {
  constructor(message: string) {
    super(`[AnalyticsProcessor] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 CONTEXTE                                                                 */
/* -------------------------------------------------------------------------- */

export interface AnalyticsProcessorContext {
  mode: AnalyticsProcessingMode;
  attempt: number;
  maxAttempts: number;
  startedAt: EpochMillis;
  timeoutMs?: number;
  correlationId?: string;
}

/* -------------------------------------------------------------------------- */
/* 📊 METRICS                                                                  */
/* -------------------------------------------------------------------------- */

export interface AnalyticsProcessorMetrics {
  processedEvents: number;
  failedEvents: number;
  avgLatencyMs?: number;
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface AnalyticsProcessorObserver {
  onStart?(event: AnalyticsEvent): void;
  onComplete?(event: AnalyticsEvent): void;
  onError?(event: AnalyticsEvent, error: Error): void;
  onMetric?(metrics: AnalyticsProcessorMetrics): void;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ PROCESSOR INTERFACE                                                      */
/* -------------------------------------------------------------------------- */

export interface AnalyticsProcessor {
  readonly name: string;
  readonly version: string;
  readonly supportsOffline?: boolean;

  process(
    event: AnalyticsEvent,
    context: AnalyticsProcessorContext,
    observer?: AnalyticsProcessorObserver
  ): Promise<AnalyticsEvent | null>;

  healthCheck(): Promise<boolean>;
}
