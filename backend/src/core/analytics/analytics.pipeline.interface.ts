/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — PIPELINE INTERFACE                                      */
/*  File: core/analytics/analytics.pipeline.interface.ts                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🧩 Streaming • Batch • Backpressure • Observable • AI Ready                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  AnalyticsPipelineID,
  AnalyticsProcessingMode,
  AnalyticsEvent,
  EpochMillis,
} from "./analytics.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class AnalyticsPipelineError extends Error {
  constructor(message: string) {
    super(`[AnalyticsPipeline] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 CONTEXTE D’EXÉCUTION                                                     */
/* -------------------------------------------------------------------------- */

export interface AnalyticsPipelineContext {
  pipelineId: AnalyticsPipelineID;
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

export interface AnalyticsPipelineMetrics {
  processedEvents: number;
  failedEvents: number;
  latencyMs?: number;
  backpressure?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface AnalyticsPipelineObserver {
  onStart?(context: AnalyticsPipelineContext): void;
  onEventProcessed?(event: AnalyticsEvent): void;
  onError?(event: AnalyticsEvent, error: Error): void;
  onMetric?(metrics: AnalyticsPipelineMetrics): void;
  onComplete?(context: AnalyticsPipelineContext): void;
}

/* -------------------------------------------------------------------------- */
/* 🧩 PIPELINE INTERFACE                                                       */
/* -------------------------------------------------------------------------- */

export interface AnalyticsPipeline {
  readonly id: AnalyticsPipelineID;
  readonly mode: AnalyticsProcessingMode;

  process(
    event: AnalyticsEvent,
    context: AnalyticsPipelineContext,
    observer?: AnalyticsPipelineObserver
  ): Promise<void>;

  healthCheck(): Promise<boolean>;
}
