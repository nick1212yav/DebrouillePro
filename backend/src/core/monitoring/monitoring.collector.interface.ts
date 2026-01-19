/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — COLLECTOR INTERFACE                                    */
/*  File: core/monitoring/monitoring.collector.interface.ts                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📥 Scraping • Push • Edge • Offline • Observable                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MonitoringCollectorID,
  MonitoringMetricEvent,
  MonitoringHealthStatus,
  EpochMillis,
} from "./monitoring.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MonitoringCollectorError extends Error {
  constructor(message: string) {
    super(`[MonitoringCollector] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧭 CONTEXTE                                                                 */
/* -------------------------------------------------------------------------- */

export interface MonitoringCollectorContext {
  collectorId: MonitoringCollectorID;
  intervalMs?: number;
  lastCollectedAt?: EpochMillis;
  correlationId?: string;
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface MonitoringCollectorObserver {
  onCollectStart?(context: MonitoringCollectorContext): void;
  onMetric?(metric: MonitoringMetricEvent): void;
  onError?(error: Error): void;
  onHealth?(status: MonitoringHealthStatus): void;
}

/* -------------------------------------------------------------------------- */
/* 📥 COLLECTOR INTERFACE                                                      */
/* -------------------------------------------------------------------------- */

export interface MonitoringCollector {
  readonly id: MonitoringCollectorID;

  start(
    context: MonitoringCollectorContext,
    observer?: MonitoringCollectorObserver
  ): Promise<void>;

  stop(): Promise<void>;

  collectOnce?(): Promise<MonitoringMetricEvent[]>;

  healthCheck(): Promise<MonitoringHealthStatus>;
}
