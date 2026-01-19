/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — PUBLIC API                                             */
/*  File: core/monitoring/index.ts                                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 Objectifs :                                                            */
/*   - Point d’entrée officiel du module Monitoring                           */
/*   - Exports gouvernés                                                      */
/*   - Zéro side-effect                                                       */
/*   - Tree-shaking friendly                                                   */
/*   - Stabilité contractuelle long terme                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🧬 FUNDAMENTAL TYPES                                                       */
/* -------------------------------------------------------------------------- */

export type {
  MonitoringMetricID,
  MonitoringAlertID,
  MonitoringCollectorID,
  MonitoringExporterID,

  EpochMillis,
  Bytes,

  MonitoringLabelKey,
  MonitoringLabelValue,
  MonitoringLabels,

  MonitoringMetricType,
  MonitoringUnit,

  MonitoringTimePoint,
  MonitoringTimeSeries,

  MonitoringSeverity,
  MonitoringAlertState,

  MonitoringTraceContext,
  MonitoringDataSensitivity,
  MonitoringOfflinePolicy,

  MonitoringMetricPayload,
  MonitoringMetricEvent,
  MonitoringAlertPayload,

  MonitoringHealthStatus,
} from "./monitoring.types";

/* -------------------------------------------------------------------------- */
/* 📊 METRIC MODEL                                                            */
/* -------------------------------------------------------------------------- */

export {
  MonitoringMetricEntity,
  MonitoringMetricError,
} from "./monitoring.metric.model";

/* -------------------------------------------------------------------------- */
/* 🚨 ALERT MODEL                                                             */
/* -------------------------------------------------------------------------- */

export {
  MonitoringAlertEntity,
  MonitoringAlertError,
} from "./monitoring.alert.model";

/* -------------------------------------------------------------------------- */
/* 📥 COLLECTORS                                                              */
/* -------------------------------------------------------------------------- */

export type {
  MonitoringCollectorContext,
  MonitoringCollectorObserver,
  MonitoringCollector,
} from "./monitoring.collector.interface";

export {
  MonitoringCollectorError,
} from "./monitoring.collector.interface";

/* -------------------------------------------------------------------------- */
/* 📤 EXPORTERS                                                               */
/* -------------------------------------------------------------------------- */

export type {
  MonitoringExporterContext,
  MonitoringExporterObserver,
  MonitoringExporter,
} from "./monitoring.exporter.interface";

export {
  MonitoringExporterError,
} from "./monitoring.exporter.interface";

export {
  ConsoleMonitoringExporter,
  PrometheusMonitoringExporter,
  OpenTelemetryMonitoringExporter,
} from "./exporters";

/* -------------------------------------------------------------------------- */
/* 🩺 SERVICE                                                                 */
/* -------------------------------------------------------------------------- */

export type {
  MonitoringServiceObserver,
  MonitoringServiceConfig,
} from "./monitoring.service";

export {
  MonitoringService,
  MonitoringServiceError,
} from "./monitoring.service";

/* -------------------------------------------------------------------------- */
/* 🧭 VERSIONING & GOVERNANCE                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Version publique du contrat Monitoring Core.
 * Toute rupture doit incrémenter MAJOR.
 */
export const MONITORING_CORE_VERSION = "1.0.0";

/**
 * Namespace canonique (logs, metrics, audit).
 */
export const MONITORING_CORE_NAMESPACE = "core.monitoring";

/* -------------------------------------------------------------------------- */
/* 🧪 GOVERNANCE NOTE                                                          */
/* -------------------------------------------------------------------------- */
/*
RÈGLE ABSOLUE :

Ne jamais importer un fichier interne directement.

Toujours importer via :

  import { MonitoringService } from "@/core/monitoring";

Cela garantit :
✔ stabilité
✔ encapsulation
✔ compatibilité future
✔ gouvernance du socle
*/
