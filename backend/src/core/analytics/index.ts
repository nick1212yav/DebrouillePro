/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — PUBLIC API                                              */
/*  File: core/analytics/index.ts                                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 Objectifs :                                                            */
/*   - Point d’entrée officiel du module Analytics                            */
/*   - Exports strictement gouvernés                                           */
/*   - Aucun side-effect                                                      */
/*   - Tree-shaking friendly                                                   */
/*   - Stabilité contractuelle long terme                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🧬 FUNDAMENTAL TYPES                                                       */
/* -------------------------------------------------------------------------- */

export type {
  AnalyticsEventID,
  AnalyticsStreamID,
  AnalyticsPipelineID,
  AnalyticsProcessorID,

  EpochMillis,
  Bytes,

  AnalyticsDimensionKey,
  AnalyticsDimensionValue,
  AnalyticsMetricValue,
  AnalyticsTimeWindow,

  AnalyticsAggregation,
  AnalyticsProcessingMode,

  AnalyticsDataSensitivity,
  AnalyticsOfflinePolicy,
  AnalyticsTraceContext,

  AnalyticsEventPayload,
  AnalyticsEvent,

  AnalyticsQuery,
  AnalyticsDataPoint,
  AnalyticsSeries,
  AnalyticsResult,
} from "./analytics.types";

/* -------------------------------------------------------------------------- */
/* 📦 EVENT MODEL                                                             */
/* -------------------------------------------------------------------------- */

export {
  AnalyticsEventEntity,
  AnalyticsEventError,
} from "./analytics.event.model";

/* -------------------------------------------------------------------------- */
/* 🧩 PIPELINES                                                               */
/* -------------------------------------------------------------------------- */

export type {
  AnalyticsPipelineContext,
  AnalyticsPipelineMetrics,
  AnalyticsPipelineObserver,
  AnalyticsPipeline,
} from "./analytics.pipeline.interface";

export {
  AnalyticsPipelineError,
} from "./analytics.pipeline.interface";

/* -------------------------------------------------------------------------- */
/* ⚙️ PROCESSORS                                                              */
/* -------------------------------------------------------------------------- */

export type {
  AnalyticsProcessorContext,
  AnalyticsProcessorMetrics,
  AnalyticsProcessorObserver,
  AnalyticsProcessor,
} from "./analytics.processor.interface";

export {
  AnalyticsProcessorError,
} from "./analytics.processor.interface";

/* -------------------------------------------------------------------------- */
/* 🚀 SERVICE                                                                 */
/* -------------------------------------------------------------------------- */

export type {
  AnalyticsServiceObserver,
  AnalyticsServiceConfig,
} from "./analytics.service";

export {
  AnalyticsService,
  AnalyticsServiceError,
} from "./analytics.service";

/* -------------------------------------------------------------------------- */
/* 📈 AGGREGATORS                                                             */
/* -------------------------------------------------------------------------- */

export {
  TimeSeriesAggregator,
  TimeSeriesAggregatorError,

  CohortAggregator,
  CohortAggregatorError,

  RealtimeAggregator,
  RealtimeAggregatorError,
} from "./aggregators";

/* -------------------------------------------------------------------------- */
/* 🧭 VERSIONING & GOVERNANCE                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Version publique du contrat Analytics Core.
 * Toute rupture doit incrémenter MAJOR.
 */
export const ANALYTICS_CORE_VERSION = "1.0.0";

/**
 * Namespace canonique (logs, metrics, audit).
 */
export const ANALYTICS_CORE_NAMESPACE = "core.analytics";

/* -------------------------------------------------------------------------- */
/* 🧪 GOVERNANCE NOTE                                                          */
/* -------------------------------------------------------------------------- */
/*
RÈGLE ABSOLUE :

Ne jamais importer un fichier interne directement.

Toujours importer via :

  import { AnalyticsService } from "@/core/analytics";

Cela garantit :
✔ stabilité
✔ encapsulation
✔ compatibilité future
✔ gouvernance du socle
*/
