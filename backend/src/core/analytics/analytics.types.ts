/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — FUNDAMENTAL TYPES                                       */
/*  File: core/analytics/analytics.types.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📊 Streaming • Batch • Offline • Secure • AI Ready                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🔤 PRIMITIVES                                                               */
/* -------------------------------------------------------------------------- */

export type AnalyticsEventID = string;
export type AnalyticsStreamID = string;
export type AnalyticsPipelineID = string;
export type AnalyticsProcessorID = string;

export type EpochMillis = number;
export type Bytes = number;

/* -------------------------------------------------------------------------- */
/* 🎛️ DIMENSIONS & METRICS                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Dimension analytique (clé de regroupement)
 * ex: country, device, channel, userSegment
 */
export type AnalyticsDimensionKey = string;
export type AnalyticsDimensionValue =
  | string
  | number
  | boolean
  | null;

/**
 * Mesure numérique
 */
export type AnalyticsMetricValue = number;

/**
 * Série temporelle
 */
export interface AnalyticsTimeWindow {
  from: EpochMillis;
  to: EpochMillis;
  granularityMs: number;
}

/* -------------------------------------------------------------------------- */
/* 🧮 AGGREGATION                                                              */
/* -------------------------------------------------------------------------- */

export type AnalyticsAggregation =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "p50"
  | "p90"
  | "p99"
  | "distinct";

/* -------------------------------------------------------------------------- */
/* 🧠 PROCESSING MODES                                                         */
/* -------------------------------------------------------------------------- */

export type AnalyticsProcessingMode =
  | "realtime"
  | "micro-batch"
  | "batch"
  | "offline";

/* -------------------------------------------------------------------------- */
/* 🔐 SECURITY                                                                 */
/* -------------------------------------------------------------------------- */

export type AnalyticsDataSensitivity =
  | "public"
  | "internal"
  | "restricted"
  | "confidential";

/* -------------------------------------------------------------------------- */
/* 🌐 OFFLINE INGESTION                                                        */
/* -------------------------------------------------------------------------- */

export interface AnalyticsOfflinePolicy {
  persist: boolean;
  maxBufferSize?: number;
  replayOnReconnect?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 🧭 TRACE                                                                    */
/* -------------------------------------------------------------------------- */

export interface AnalyticsTraceContext {
  traceId?: string;
  correlationId?: string;
  source?: string;
  region?: string;
}

/* -------------------------------------------------------------------------- */
/* 📦 EVENT PAYLOAD                                                            */
/* -------------------------------------------------------------------------- */

export interface AnalyticsEventPayload {
  name: string;
  dimensions?: Record<
    AnalyticsDimensionKey,
    AnalyticsDimensionValue
  >;
  metrics?: Record<string, AnalyticsMetricValue>;
  timestamp?: EpochMillis;
}

/* -------------------------------------------------------------------------- */
/* 📣 ANALYTICS EVENT                                                          */
/* -------------------------------------------------------------------------- */

export interface AnalyticsEvent {
  id: AnalyticsEventID;
  stream: AnalyticsStreamID;
  payload: AnalyticsEventPayload;
  timestamp: EpochMillis;

  sensitivity?: AnalyticsDataSensitivity;
  trace?: AnalyticsTraceContext;
  offline?: AnalyticsOfflinePolicy;

  sizeBytes?: Bytes;
}

/* -------------------------------------------------------------------------- */
/* 🧪 QUERY TYPES                                                              */
/* -------------------------------------------------------------------------- */

export interface AnalyticsQuery {
  stream: AnalyticsStreamID;
  dimensions?: AnalyticsDimensionKey[];
  metrics?: string[];
  aggregation: AnalyticsAggregation;
  window: AnalyticsTimeWindow;
  filters?: Record<string, any>;
}

/* -------------------------------------------------------------------------- */
/* 📊 RESULT TYPES                                                             */
/* -------------------------------------------------------------------------- */

export interface AnalyticsDataPoint {
  timestamp: EpochMillis;
  value: number;
  dimensions?: Record<string, AnalyticsDimensionValue>;
}

export interface AnalyticsSeries {
  metric: string;
  points: AnalyticsDataPoint[];
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  series: AnalyticsSeries[];
  generatedAt: EpochMillis;
}
