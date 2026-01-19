/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — EVENT MODEL                                             */
/*  File: core/analytics/analytics.event.model.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Immutable • Normalized • Auditable • Offline Safe                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  AnalyticsEvent,
  AnalyticsEventID,
  AnalyticsEventPayload,
  AnalyticsStreamID,
  AnalyticsDataSensitivity,
  AnalyticsTraceContext,
  AnalyticsOfflinePolicy,
  EpochMillis,
  Bytes,
} from "./analytics.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class AnalyticsEventError extends Error {
  constructor(message: string) {
    super(`[AnalyticsEvent] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧠 UTILITAIRES INTERNES                                                     */
/* -------------------------------------------------------------------------- */

function now(): EpochMillis {
  return Date.now();
}

function generateId(): AnalyticsEventID {
  return `ae_${now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
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
/* 🧬 EVENT ENTITY                                                             */
/* -------------------------------------------------------------------------- */

export class AnalyticsEventEntity {
  readonly snapshot: AnalyticsEvent;

  private constructor(event: AnalyticsEvent) {
    this.snapshot = deepFreeze(event);
  }

  /* ------------------------------------------------------------------------ */
  /* 🏗️ FACTORY                                                                */
  /* ------------------------------------------------------------------------ */

  static create(params: {
    stream: AnalyticsStreamID;
    payload: AnalyticsEventPayload;
    sensitivity?: AnalyticsDataSensitivity;
    trace?: AnalyticsTraceContext;
    offline?: AnalyticsOfflinePolicy;
  }): AnalyticsEventEntity {
    if (!params.stream) {
      throw new AnalyticsEventError("Stream is required");
    }

    if (!params.payload?.name) {
      throw new AnalyticsEventError(
        "Payload.name is required"
      );
    }

    const timestamp =
      params.payload.timestamp ?? now();

    const baseEvent: AnalyticsEvent = {
      id: generateId(),
      stream: params.stream,
      payload: {
        ...params.payload,
        timestamp,
      },
      timestamp,
      sensitivity: params.sensitivity ?? "internal",
      trace: params.trace,
      offline: params.offline,
      sizeBytes: 0,
    };

    const sizeBytes = computeSizeBytes(baseEvent);

    return new AnalyticsEventEntity({
      ...baseEvent,
      sizeBytes,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ HYDRATION                                                              */
  /* ------------------------------------------------------------------------ */

  static hydrate(event: AnalyticsEvent): AnalyticsEventEntity {
    if (!event.id) {
      throw new AnalyticsEventError(
        "Invalid event: missing id"
      );
    }
    return new AnalyticsEventEntity(event);
  }
}
