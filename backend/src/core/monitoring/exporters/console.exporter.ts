/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — CONSOLE EXPORTER                                       */
/*  File: core/monitoring/exporters/console.exporter.ts                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🖥️ Human Readable • Zero Dependency • Edge Friendly                        */
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
/* 🖥️ CONSOLE EXPORTER                                                         */
/* -------------------------------------------------------------------------- */

export class ConsoleMonitoringExporter
  implements MonitoringExporter
{
  readonly id = "console";

  private observer?: MonitoringExporterObserver;
  private started = false;
  private exportedCount = 0;

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
      console.log(
        "📊 METRIC",
        JSON.stringify(metric, null, 2)
      );
      this.exportedCount++;
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
      console.warn(
        "🚨 ALERT",
        JSON.stringify(alert, null, 2)
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<MonitoringHealthStatus> {
    return {
      healthy: this.started,
      checkedAt: Date.now(),
      message: this.started
        ? "Console exporter running"
        : "Console exporter stopped",
      details: {
        exportedCount: this.exportedCount,
      },
    };
  }
}
