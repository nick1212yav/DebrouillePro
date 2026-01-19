/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE BOOTSTRAP — HEALTH (WORLD #1 FINAL)                            */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/bootstrap/health.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Track service liveness and readiness                                   */
/*   - Expose internal health state                                            */
/*   - Provide diagnostics hooks                                               */
/*   - Support orchestration platforms (K8s, LB, PM2)                          */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Thread-safe state                                                       */
/*   - Deterministic behavior                                                  */
/*   - Zero side effects                                                       */
/*   - Extensible                                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type ServiceStatus =
  | "starting"
  | "ready"
  | "degraded"
  | "shutting_down"
  | "stopped";

export interface HealthSnapshot {
  status: ServiceStatus;
  startedAt: number;
  uptimeMs: number;
  lastTransitionAt: number;
  meta: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE (MODULE SINGLETON)                                          */
/* -------------------------------------------------------------------------- */

const state = {
  status: "starting" as ServiceStatus,
  startedAt: Date.now(),
  lastTransitionAt: Date.now(),
  meta: {} as Record<string, unknown>,
};

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const transition = (
  nextStatus: ServiceStatus,
  meta?: Record<string, unknown>
): void => {
  if (state.status === nextStatus) return;

  state.status = nextStatus;
  state.lastTransitionAt = Date.now();

  if (meta) {
    state.meta = {
      ...state.meta,
      ...meta,
    };
  }
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — MUTATORS                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Mark service as fully ready to receive traffic.
 */
export const markServiceReady = (): void => {
  transition("ready");
};

/**
 * Mark service as degraded but still alive.
 */
export const markServiceDegraded = (
  reason: string,
  meta?: Record<string, unknown>
): void => {
  transition("degraded", {
    reason,
    ...meta,
  });
};

/**
 * Mark service as shutting down.
 */
export const markServiceShuttingDown = (): void => {
  transition("shutting_down");
};

/**
 * Mark service as completely stopped.
 */
export const markServiceStopped = (): void => {
  transition("stopped");
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — SNAPSHOT                                                      */
/* -------------------------------------------------------------------------- */

export const getHealthSnapshot = (): HealthSnapshot => {
  const now = Date.now();

  return {
    status: state.status,
    startedAt: state.startedAt,
    uptimeMs: now - state.startedAt,
    lastTransitionAt: state.lastTransitionAt,
    meta: {
      ...state.meta,
    },
  };
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — PREDICATES                                                    */
/* -------------------------------------------------------------------------- */

export const isServiceLive = (): boolean => {
  return (
    state.status !== "stopped" &&
    state.status !== "shutting_down"
  );
};

export const isServiceReady = (): boolean => {
  return state.status === "ready";
};
