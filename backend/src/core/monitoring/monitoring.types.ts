/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — FUNDAMENTAL TYPES                                      */
/*  File: core/monitoring/monitoring.types.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🩺 Metrics • Traces • Alerts • Offline • Planet-Scale • AI Ready           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🔤 PRIMITIVES                                                               */
/* -------------------------------------------------------------------------- */

export type MonitoringMetricID = string;
export type MonitoringAlertID = string;
export type MonitoringCollectorID = string;
export type MonitoringExporterID = string;

export type EpochMillis = number;
export type Bytes = number;

/* -------------------------------------------------------------------------- */
/* 🏷️ LABELS / DIMENSIONS                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Label / dimension pour enrichir une métrique.
 * ex: service=auth, region=africa, node=edge-01
 */
export type MonitoringLabelKey = string;
export type MonitoringLabelValue =
  | string
  | number
  | boolean
  | null;

export type MonitoringLabels = Record<
  MonitoringLabelKey,
  MonitoringLabelValue
>;

/* -------------------------------------------------------------------------- */
/* 📏 METRIC TYPES                                                             */
/* -------------------------------------------------------------------------- */

export type MonitoringMetricType =
  | "counter"       // monotonique croissant
  | "gauge"         // valeur instantanée
  | "histogram"     // distribution
  | "summary";      // percentiles

/* -------------------------------------------------------------------------- */
/* 📐 METRIC UNIT                                                              */
/* -------------------------------------------------------------------------- */

export type MonitoringUnit =
  | "count"
  | "bytes"
  | "milliseconds"
  | "seconds"
  | "percent"
  | "ratio"
  | "custom";

/* -------------------------------------------------------------------------- */
/* ⏱️ TIME SERIES                                                              */
/* -------------------------------------------------------------------------- */

export interface MonitoringTimePoint {
  timestamp: EpochMillis;
  value: number;
}

export interface MonitoringTimeSeries {
  metricId: MonitoringMetricID;
  labels?: MonitoringLabels;
  points: MonitoringTimePoint[];
}

/* -------------------------------------------------------------------------- */
/* 🚦 SEVERITY                                                                 */
/* -------------------------------------------------------------------------- */

export type MonitoringSeverity =
  | "info"
  | "warning"
  | "critical"
  | "emergency";

/* -------------------------------------------------------------------------- */
/* 🔔 ALERT STATE                                                              */
/* -------------------------------------------------------------------------- */

export type MonitoringAlertState =
  | "active"
  | "resolved"
  | "acknowledged"
  | "suppressed";

/* -------------------------------------------------------------------------- */
/* 🧭 TRACE CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export interface MonitoringTraceContext {
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  source?: string;
  region?: string;
}

/* -------------------------------------------------------------------------- */
/* 🔐 SECURITY                                                                 */
/* -------------------------------------------------------------------------- */

export type MonitoringDataSensitivity =
  | "public"
  | "internal"
  | "restricted"
  | "confidential";

/* -------------------------------------------------------------------------- */
/* ♻️ OFFLINE POLICY                                                           */
/* -------------------------------------------------------------------------- */

export interface MonitoringOfflinePolicy {
  persist: boolean;
  maxBufferSize?: number;
  replayOnReconnect?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 📊 METRIC PAYLOAD                                                           */
/* -------------------------------------------------------------------------- */

export interface MonitoringMetricPayload {
  id: MonitoringMetricID;
  type: MonitoringMetricType;
  unit?: MonitoringUnit;
  value: number;
  labels?: MonitoringLabels;
  timestamp?: EpochMillis;
}

/* -------------------------------------------------------------------------- */
/* 📈 METRIC EVENT                                                             */
/* -------------------------------------------------------------------------- */

export interface MonitoringMetricEvent {
  payload: MonitoringMetricPayload;
  timestamp: EpochMillis;

  sensitivity?: MonitoringDataSensitivity;
  trace?: MonitoringTraceContext;
  offline?: MonitoringOfflinePolicy;

  sizeBytes?: Bytes;
}

/* -------------------------------------------------------------------------- */
/* 🚨 ALERT PAYLOAD                                                            */
/* -------------------------------------------------------------------------- */

export interface MonitoringAlertPayload {
  id: MonitoringAlertID;
  metricId?: MonitoringMetricID;
  severity: MonitoringSeverity;
  state: MonitoringAlertState;
  message: string;
  labels?: MonitoringLabels;
  triggeredAt: EpochMillis;
  resolvedAt?: EpochMillis;
}

/* -------------------------------------------------------------------------- */
/* 🧪 HEALTH CHECK                                                             */
/* -------------------------------------------------------------------------- */

export interface MonitoringHealthStatus {
  healthy: boolean;
  checkedAt: EpochMillis;
  message?: string;
  details?: Record<string, any>;
}
