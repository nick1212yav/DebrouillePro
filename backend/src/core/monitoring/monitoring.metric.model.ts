/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — METRIC MODEL                                           */
/*  File: core/monitoring/monitoring.metric.model.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📊 Immutable • Normalized • Auditable • Exportable                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MonitoringMetricEvent,
  MonitoringMetricPayload,
  MonitoringMetricType,
  MonitoringUnit,
  EpochMillis,
  Bytes,
} from "./monitoring.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MonitoringMetricError extends Error {
  constructor(message: string) {
    super(`[MonitoringMetric] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧠 UTILITAIRES INTERNES                                                     */
/* -------------------------------------------------------------------------- */

function now(): EpochMillis {
  return Date.now();
}

function computeSizeBytes(obj: unknown): Bytes {
  try {
    return new TextEncoder().encode(
      JSON.stringify(obj)
    ).byteLength;
  } catch {
    return 0;
  }
}

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value: any = (obj as any)[prop];
    if (
      value &&
      typeof value === "object" &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  });
  return obj;
}

/* -------------------------------------------------------------------------- */
/* 🧬 METRIC ENTITY                                                            */
/* -------------------------------------------------------------------------- */

export class MonitoringMetricEntity {
  readonly snapshot: MonitoringMetricEvent;

  private constructor(event: MonitoringMetricEvent) {
    this.snapshot = deepFreeze(event);
  }

  /* ------------------------------------------------------------------------ */
  /* 🏗️ FACTORY                                                                */
  /* ------------------------------------------------------------------------ */

  static create(
    payload: MonitoringMetricPayload
  ): MonitoringMetricEntity {
    if (!payload.id) {
      throw new MonitoringMetricError(
        "Metric id is required"
      );
    }

    if (
      payload.type === "counter" &&
      payload.value < 0
    ) {
      throw new MonitoringMetricError(
        "Counter cannot be negative"
      );
    }

    const timestamp =
      payload.timestamp ?? now();

    const normalized: MonitoringMetricEvent = {
      payload: {
        ...payload,
        unit: payload.unit ?? ("count" as MonitoringUnit),
        timestamp,
      },
      timestamp,
      sizeBytes: 0,
    };

    const sizeBytes = computeSizeBytes(normalized);

    return new MonitoringMetricEntity({
      ...normalized,
      sizeBytes,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ HYDRATION                                                              */
  /* ------------------------------------------------------------------------ */

  static hydrate(
    event: MonitoringMetricEvent
  ): MonitoringMetricEntity {
    if (!event.payload?.id) {
      throw new MonitoringMetricError(
        "Invalid metric event"
      );
    }
    return new MonitoringMetricEntity(event);
  }
}
