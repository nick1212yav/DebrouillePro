/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — OPENTELEMETRY EXPORTER                                 */
/*  File: core/monitoring/exporters/otel.exporter.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌍 OTEL Compatible • Cloud Bridge • Zero Dependency                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MonitoringExporter,
  MonitoringExporterContext,
  MonitoringExporterObserver,
} from "../monitoring.exporter.interface";

import {
  MonitoringMetricEvent,
  MonitoringAlertPayload,
  MonitoringHealthStatus,
} from "../monitoring.types";

/* -------------------------------------------------------------------------- */
/* 🧱 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

interface OTELMetric {
  name: string;
  value: number;
  attributes: Record<string, string>;
  timestamp: number;
}

interface OTELAlert {
  id: string;
  severity: string;
  message: string;
  attributes?: Record<string, string>;
  timestamp: number;
}

/* -------------------------------------------------------------------------- */
/* 🌍 OTEL EXPORTER                                                            */
/* -------------------------------------------------------------------------- */

export class OpenTelemetryMonitoringExporter
  implements MonitoringExporter
{
  readonly id = "otel";

  private observer?: MonitoringExporterObserver;
  private started = false;

  private readonly metricBuffer: OTELMetric[] = [];
  private readonly alertBuffer: OTELAlert[] = [];

  /* ------------------------------------------------------------------------ */
  /* ▶️ LIFECYCLE                                                              */
  /* ------------------------------------------------------------------------ */

  async start(
    _context: MonitoringExporterContext,
    observer?: MonitoringExporterObserver
  ): Promise<void> {
    this.observer = observer;
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
    this.metricBuffer.length = 0;
    this.alertBuffer.length = 0;
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 EXPORT METRICS                                                         */
  /* ------------------------------------------------------------------------ */

  async exportMetrics(
    metrics: MonitoringMetricEvent[]
  ): Promise<void> {
    if (!this.started) return;

    const start = Date.now();
    this.observer?.onExportStart?.(metrics.length);

    for (const metric of metrics) {
      this.metricBuffer.push(
        this.mapMetric(metric)
      );
    }

    const duration = Date.now() - start;
    this.observer?.onExportSuccess?.(
      metrics.length,
      duration
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 🚨 EXPORT ALERTS                                                          */
  /* ------------------------------------------------------------------------ */

  async exportAlerts(
    alerts: MonitoringAlertPayload[]
  ): Promise<void> {
    if (!this.started) return;

    for (const alert of alerts) {
      this.alertBuffer.push(
        this.mapAlert(alert)
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🌐 FLUSH                                                                  */
  /* ------------------------------------------------------------------------ */

  /**
   * Placeholder for real OTEL transport integration.
   * (HTTP, gRPC, agent, etc.)
   */
  async flush(): Promise<void> {
    if (!this.started) return;

    // Simulate export latency
    await new Promise((r) => setTimeout(r, 5));

    this.metricBuffer.length = 0;
    this.alertBuffer.length = 0;
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<MonitoringHealthStatus> {
    return {
      healthy: this.started,
      checkedAt: Date.now(),
      message: this.started
        ? "OTEL exporter running"
        : "OTEL exporter stopped",
      details: {
        bufferedMetrics: this.metricBuffer.length,
        bufferedAlerts: this.alertBuffer.length,
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNAL MAPPING                                                       */
  /* ------------------------------------------------------------------------ */

  private mapMetric(
    metric: MonitoringMetricEvent
  ): OTELMetric {
    return {
      name: metric.payload.id,
      value: metric.payload.value,
      attributes: this.normalizeLabels(
        metric.payload.labels
      ),
      timestamp: metric.timestamp,
    };
  }

  private mapAlert(
    alert: MonitoringAlertPayload
  ): OTELAlert {
    return {
      id: alert.id,
      severity: alert.severity,
      message: alert.message,
      attributes: this.normalizeLabels(
        alert.labels
      ),
      timestamp: alert.triggeredAt,
    };
  }

  private normalizeLabels(
    labels?: Record<string, any>
  ): Record<string, string> {
    if (!labels) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(labels)) {
      result[k] = String(v);
    }
    return result;
  }
}
