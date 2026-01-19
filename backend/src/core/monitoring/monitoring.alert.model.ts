/* -------------------------------------------------------------------------- */
/*  CORE / MONITORING — ALERT MODEL                                            */
/*  File: core/monitoring/monitoring.alert.model.ts                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🚨 Immutable • Lifecycle Safe • Auditable                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  MonitoringAlertPayload,
  MonitoringAlertState,
  MonitoringSeverity,
  EpochMillis,
} from "./monitoring.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class MonitoringAlertError extends Error {
  constructor(message: string) {
    super(`[MonitoringAlert] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧠 UTILITAIRES                                                              */
/* -------------------------------------------------------------------------- */

function now(): EpochMillis {
  return Date.now();
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
/* 🔄 STATE MACHINE                                                            */
/* -------------------------------------------------------------------------- */

const VALID_TRANSITIONS: Record<
  MonitoringAlertState,
  MonitoringAlertState[]
> = {
  active: ["acknowledged", "resolved", "suppressed"],
  acknowledged: ["resolved", "suppressed"],
  suppressed: ["active", "resolved"],
  resolved: [],
};

/* -------------------------------------------------------------------------- */
/* 🚨 ALERT ENTITY                                                             */
/* -------------------------------------------------------------------------- */

export class MonitoringAlertEntity {
  readonly snapshot: MonitoringAlertPayload;

  private constructor(payload: MonitoringAlertPayload) {
    this.snapshot = deepFreeze(payload);
  }

  /* ------------------------------------------------------------------------ */
  /* 🏗️ FACTORY                                                                */
  /* ------------------------------------------------------------------------ */

  static create(params: {
    id: string;
    severity: MonitoringSeverity;
    message: string;
    metricId?: string;
    labels?: Record<string, any>;
  }): MonitoringAlertEntity {
    if (!params.id) {
      throw new MonitoringAlertError("Alert id is required");
    }

    if (!params.message) {
      throw new MonitoringAlertError(
        "Alert message is required"
      );
    }

    const payload: MonitoringAlertPayload = {
      id: params.id,
      severity: params.severity,
      state: "active",
      message: params.message,
      metricId: params.metricId,
      labels: params.labels,
      triggeredAt: now(),
    };

    return new MonitoringAlertEntity(payload);
  }

  /* ------------------------------------------------------------------------ */
  /* 🔁 TRANSITIONS                                                            */
  /* ------------------------------------------------------------------------ */

  transition(
    next: MonitoringAlertState
  ): MonitoringAlertEntity {
    const current = this.snapshot.state;
    const allowed = VALID_TRANSITIONS[current];

    if (!allowed.includes(next)) {
      throw new MonitoringAlertError(
        `Invalid transition from ${current} to ${next}`
      );
    }

    const updated: MonitoringAlertPayload = {
      ...this.snapshot,
      state: next,
      resolvedAt:
        next === "resolved"
          ? now()
          : this.snapshot.resolvedAt,
    };

    return new MonitoringAlertEntity(updated);
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ HYDRATION                                                              */
  /* ------------------------------------------------------------------------ */

  static hydrate(
    payload: MonitoringAlertPayload
  ): MonitoringAlertEntity {
    if (!payload.id || !payload.state) {
      throw new MonitoringAlertError(
        "Invalid alert payload"
      );
    }
    return new MonitoringAlertEntity(payload);
  }
}
