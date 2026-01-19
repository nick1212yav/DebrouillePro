/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — PROMETHEUS EXPORTER                                    */
/*  File: core/monitoring/exporters/prometheus.exporter.ts                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📈 Prometheus Compatible • Scrape Ready • Zero Dependency                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MonitoringExporter,
  MonitoringExporterContext,
  MonitoringExporterObserver,
} from "../monitoring.exporter.interface";

import {
  MonitoringMetricEvent,
  MonitoringHealthStatus,
  MonitoringMetricType,
} from "../monitoring.types";

/* -------------------------------------------------------------------------- */
/* 🧱 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

type PromMetric = {
  type: MonitoringMetricType;
  help?: string;
  labels: Record<string, string>;
  value: number;
  updatedAt: number;
};

/* -------------------------------------------------------------------------- */
/* 📈 PROMETHEUS EXPORTER                                                      */
/* -------------------------------------------------------------------------- */

export class PrometheusMonitoringExporter
  implements MonitoringExporter
{
  readonly id = "prometheus";

  private readonly registry = new Map<
    string,
    PromMetric
  >();

  private observer?: MonitoringExporterObserver;
  private started = false;

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
    this.registry.clear();
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
      const key = this.buildKey(metric);

      this.registry.set(key, {
        type: metric.payload.type,
        help: metric.payload.id,
        labels: this.normalizeLabels(
          metric.payload.labels ?? {}
        ),
        value: metric.payload.value,
        updatedAt: Date.now(),
      });
    }

    const duration = Date.now() - start;
    this.observer?.onExportSuccess?.(
      metrics.length,
      duration
    );
  }

  /* ------------------------------------------------------------------------ */
  /* 🌐 SCRAPE OUTPUT                                                          */
  /* ------------------------------------------------------------------------ */

  /**
   * Expose Prometheus compatible text format.
   * Can be bound to HTTP endpoint externally.
   */
  scrape(): string {
    const lines: string[] = [];

    for (const [key, metric] of this.registry) {
      lines.push(`# HELP ${key} ${metric.help}`);
      lines.push(`# TYPE ${key} ${metric.type}`);

      const labelString = this.formatLabels(
        metric.labels
      );

      lines.push(
        `${key}${labelString} ${metric.value}`
      );
    }

    return lines.join("\n");
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<MonitoringHealthStatus> {
    return {
      healthy: this.started,
      checkedAt: Date.now(),
      message: this.started
        ? "Prometheus exporter running"
        : "Prometheus exporter stopped",
      details: {
        metricsCount: this.registry.size,
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private buildKey(
    metric: MonitoringMetricEvent
  ): string {
    return metric.payload.id
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .toLowerCase();
  }

  private normalizeLabels(
    labels: Record<string, any>
  ): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(labels)) {
      normalized[k] = String(v);
    }
    return normalized;
  }

  private formatLabels(
    labels: Record<string, string>
  ): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return "";

    const inner = entries
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");

    return `{${inner}}`;
  }
}
