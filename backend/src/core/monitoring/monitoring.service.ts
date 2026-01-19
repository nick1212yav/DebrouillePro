/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — MONITORING SERVICE (ORCHESTRATOR)                      */
/*  File: core/monitoring/monitoring.service.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🩺 Collect • Route • Buffer • Alert • Observe • Scale                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MonitoringMetricEvent,
  MonitoringAlertPayload,
  MonitoringHealthStatus,
} from "./monitoring.types";

import {
  MonitoringCollector,
  MonitoringCollectorObserver,
} from "./monitoring.collector.interface";

import {
  MonitoringExporter,
  MonitoringExporterObserver,
} from "./monitoring.exporter.interface";

import {
  MonitoringMetricEntity,
} from "./monitoring.metric.model";

import {
  MonitoringAlertEntity,
} from "./monitoring.alert.model";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MonitoringServiceError extends Error {
  constructor(message: string) {
    super(`[MonitoringService] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface MonitoringServiceObserver {
  onMetricIngested?(metric: MonitoringMetricEvent): void;
  onAlertRaised?(alert: MonitoringAlertPayload): void;
  onExporterError?(exporterId: string, error: Error): void;
  onCollectorError?(collectorId: string, error: Error): void;
  onBackpressure?(queueSize: number): void;
  onHealth?(status: MonitoringHealthStatus): void;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURATION                                                            */
/* -------------------------------------------------------------------------- */

export interface MonitoringServiceConfig {
  maxMetricBuffer?: number;
  maxAlertBuffer?: number;
  autoFlush?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 📦 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

interface BufferedMetric {
  metric: MonitoringMetricEvent;
  retry: number;
}

interface BufferedAlert {
  alert: MonitoringAlertPayload;
  retry: number;
}

/* -------------------------------------------------------------------------- */
/* 🩺 MONITORING SERVICE                                                       */
/* -------------------------------------------------------------------------- */

export class MonitoringService {
  private readonly collectors = new Map<
    string,
    MonitoringCollector
  >();

  private readonly exporters = new Map<
    string,
    MonitoringExporter
  >();

  private readonly metricBuffer: BufferedMetric[] = [];
  private readonly alertBuffer: BufferedAlert[] = [];

  constructor(
    private readonly observer?: MonitoringServiceObserver,
    private readonly config: MonitoringServiceConfig = {}
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 📥 COLLECTOR REGISTRATION                                                 */
  /* ------------------------------------------------------------------------ */

  registerCollector(collector: MonitoringCollector) {
    this.collectors.set(collector.id, collector);
  }

  async startCollector(collectorId: string) {
    const collector = this.collectors.get(collectorId);
    if (!collector) return;

    const observer: MonitoringCollectorObserver = {
      onMetric: (metric) => this.ingestMetric(metric),
      onError: (err) =>
        this.observer?.onCollectorError?.(
          collectorId,
          err
        ),
      onHealth: (health) =>
        this.observer?.onHealth?.(health),
    };

    await collector.start(
      { collectorId },
      observer
    );
  }

  async stopCollector(collectorId: string) {
    const collector = this.collectors.get(collectorId);
    await collector?.stop();
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 EXPORTER REGISTRATION                                                  */
  /* ------------------------------------------------------------------------ */

  registerExporter(exporter: MonitoringExporter) {
    this.exporters.set(exporter.id, exporter);
  }

  async startExporter(exporterId: string) {
    const exporter = this.exporters.get(exporterId);
    if (!exporter) return;

    const observer: MonitoringExporterObserver = {
      onExportError: (err) =>
        this.observer?.onExporterError?.(
          exporterId,
          err
        ),
      onBackpressure: (size) =>
        this.observer?.onBackpressure?.(size),
      onHealth: (health) =>
        this.observer?.onHealth?.(health),
    };

    await exporter.start(
      { exporterId },
      observer
    );
  }

  async stopExporter(exporterId: string) {
    const exporter = this.exporters.get(exporterId);
    await exporter?.stop();
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 METRIC INGESTION                                                       */
  /* ------------------------------------------------------------------------ */

  ingestMetric(raw: MonitoringMetricEvent) {
    try {
      const entity =
        MonitoringMetricEntity.hydrate(raw);

      const metric = entity.snapshot;

      this.metricBuffer.push({
        metric,
        retry: 0,
      });

      this.observer?.onMetricIngested?.(metric);

      this.trimMetricBuffer();

      if (this.config.autoFlush !== false) {
        this.flushMetrics();
      }
    } catch (err: any) {
      throw new MonitoringServiceError(err.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🚨 ALERT INGESTION                                                        */
  /* ------------------------------------------------------------------------ */

  ingestAlert(raw: MonitoringAlertPayload) {
    try {
      const entity =
        MonitoringAlertEntity.hydrate(raw);

      const alert = entity.snapshot;

      this.alertBuffer.push({
        alert,
        retry: 0,
      });

      this.observer?.onAlertRaised?.(alert);

      this.trimAlertBuffer();

      if (this.config.autoFlush !== false) {
        this.flushAlerts();
      }
    } catch (err: any) {
      throw new MonitoringServiceError(err.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 FLUSH METRICS                                                          */
  /* ------------------------------------------------------------------------ */

  async flushMetrics() {
    if (this.metricBuffer.length === 0) return;

    const batch = this.metricBuffer.splice(0);

    for (const exporter of this.exporters.values()) {
      try {
        await exporter.exportMetrics(
          batch.map((b) => b.metric)
        );
      } catch (err: any) {
        this.observer?.onExporterError?.(
          exporter.id,
          err
        );

        // re-buffer on failure
        batch.forEach((b) =>
          this.metricBuffer.push(b)
        );
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🚨 FLUSH ALERTS                                                           */
  /* ------------------------------------------------------------------------ */

  async flushAlerts() {
    if (this.alertBuffer.length === 0) return;

    const batch = this.alertBuffer.splice(0);

    for (const exporter of this.exporters.values()) {
      if (!exporter.exportAlerts) continue;

      try {
        await exporter.exportAlerts(
          batch.map((b) => b.alert)
        );
      } catch (err: any) {
        this.observer?.onExporterError?.(
          exporter.id,
          err
        );

        // re-buffer on failure
        batch.forEach((b) =>
          this.alertBuffer.push(b)
        );
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<MonitoringHealthStatus> {
    const statuses: MonitoringHealthStatus[] = [];

    for (const collector of this.collectors.values()) {
      statuses.push(await collector.healthCheck());
    }

    for (const exporter of this.exporters.values()) {
      statuses.push(await exporter.healthCheck());
    }

    const healthy = statuses.every((s) => s.healthy);

    const status: MonitoringHealthStatus = {
      healthy,
      checkedAt: Date.now(),
      details: {
        collectors: this.collectors.size,
        exporters: this.exporters.size,
        bufferedMetrics: this.metricBuffer.length,
        bufferedAlerts: this.alertBuffer.length,
      },
    };

    this.observer?.onHealth?.(status);

    return status;
  }

  /* ------------------------------------------------------------------------ */
  /* 🧠 INTERNALS                                                              */
  /* ------------------------------------------------------------------------ */

  private trimMetricBuffer() {
    const limit = this.config.maxMetricBuffer ?? 50_000;
    if (this.metricBuffer.length > limit) {
      this.metricBuffer.splice(
        0,
        this.metricBuffer.length - limit
      );
    }
  }

  private trimAlertBuffer() {
    const limit = this.config.maxAlertBuffer ?? 10_000;
    if (this.alertBuffer.length > limit) {
      this.alertBuffer.splice(
        0,
        this.alertBuffer.length - limit
      );
    }
  }
}
