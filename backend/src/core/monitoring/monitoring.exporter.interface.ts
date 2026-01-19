/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — EXPORTER INTERFACE                                     */
/*  File: core/monitoring/monitoring.exporter.interface.ts                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📤 Export • Retry • Buffer • Secure • Observable                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MonitoringExporterID,
  MonitoringMetricEvent,
  MonitoringAlertPayload,
  MonitoringHealthStatus,
  EpochMillis,
} from "./monitoring.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MonitoringExporterError extends Error {
  constructor(message: string) {
    super(`[MonitoringExporter] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 CONTEXTE                                                                 */
/* -------------------------------------------------------------------------- */

export interface MonitoringExporterContext {
  exporterId: MonitoringExporterID;
  batchSize?: number;
  flushIntervalMs?: number;
  maxRetry?: number;
  lastFlushAt?: EpochMillis;
  correlationId?: string;
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface MonitoringExporterObserver {
  onExportStart?(count: number): void;
  onExportSuccess?(count: number, durationMs: number): void;
  onExportError?(error: Error): void;
  onBackpressure?(queueSize: number): void;
  onHealth?(status: MonitoringHealthStatus): void;
}

/* -------------------------------------------------------------------------- */
/* 📤 EXPORTER INTERFACE                                                       */
/* -------------------------------------------------------------------------- */

export interface MonitoringExporter {
  readonly id: MonitoringExporterID;

  start(
    context: MonitoringExporterContext,
    observer?: MonitoringExporterObserver
  ): Promise<void>;

  stop(): Promise<void>;

  exportMetrics(
    metrics: MonitoringMetricEvent[]
  ): Promise<void>;

  exportAlerts?(
    alerts: MonitoringAlertPayload[]
  ): Promise<void>;

  flush?(): Promise<void>;

  healthCheck(): Promise<MonitoringHealthStatus>;
}
