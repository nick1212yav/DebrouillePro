/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD BOOTSTRAP (GLOBAL ORCHESTRATOR)                     */
/*  File: backend/src/core/pay/fraud.index.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Initialiser tout le sous-système antifraude                              */
/*  - Orchestrer engine, hooks, events, IA, tracking                           */
/*  - Exposer health, metrics, readiness                                       */
/*  - Permettre le hot-plug de nouvelles stratégies                            */
/*  - Garantir auto-réparation et tolérance aux pannes                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { FraudEngine } from "./fraud.engine";
import { initializeFraudHooks } from "./fraud.hooks";
import { fraudEventBus } from "./fraud.events";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type FraudSubsystemStatus =
  | "BOOTING"
  | "READY"
  | "DEGRADED"
  | "FAILED";

export interface FraudHealthSnapshot {
  status: FraudSubsystemStatus;
  startedAt: Date;
  uptimeMs: number;
  engineReady: boolean;
  hooksReady: boolean;
  listenersCount: number;
  lastError?: string;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

let status: FraudSubsystemStatus = "BOOTING";
let startedAt = new Date();
let lastError: string | undefined;

/* -------------------------------------------------------------------------- */
/* BOOTSTRAP                                                                  */
/* -------------------------------------------------------------------------- */

export async function initializeFraudSubsystem(): Promise<void> {
  console.info("🧠 Initializing Fraud Subsystem...");

  try {
    /* -------------------------------------------------------------- */
    /* ENGINE INIT                                                    */
    /* -------------------------------------------------------------- */

    await FraudEngine.initialize();
    console.info("✅ Fraud engine ready");

    /* -------------------------------------------------------------- */
    /* HOOKS INIT                                                     */
    /* -------------------------------------------------------------- */

    initializeFraudHooks();
    console.info("✅ Fraud hooks wired");

    /* -------------------------------------------------------------- */
    /* EVENT BUS HEALTH CHECK                                         */
    /* -------------------------------------------------------------- */

    const listenersCount = fraudEventBus.listenerCount();

    if (listenersCount === 0) {
      console.warn(
        "⚠️ Fraud subsystem has no listeners registered"
      );
    }

    status = "READY";
  } catch (error: any) {
    console.error("❌ Fraud subsystem failed to initialize", error);
    lastError = error?.message || "Unknown error";
    status = "FAILED";
  }
}

/* -------------------------------------------------------------------------- */
/* HEALTH & OBSERVABILITY                                                     */
/* -------------------------------------------------------------------------- */

export function getFraudHealth(): FraudHealthSnapshot {
  const uptimeMs = Date.now() - startedAt.getTime();

  return {
    status,
    startedAt,
    uptimeMs,
    engineReady: FraudEngine.isReady(),
    hooksReady: fraudEventBus.listenerCount() > 0,
    listenersCount: fraudEventBus.listenerCount(),
    lastError,
  };
}

/* -------------------------------------------------------------------------- */
/* RESILIENCE / AUTO HEALING                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Auto-restart intelligent en cas de panne.
 */
export async function ensureFraudSubsystem(): Promise<void> {
  if (status === "READY") return;

  console.warn("♻️ Fraud subsystem not ready. Attempting recovery...");

  try {
    status = "BOOTING";
    await initializeFraudSubsystem();
  } catch (error) {
    console.error("🔥 Fraud subsystem recovery failed", error);
    status = "DEGRADED";
  }
}

/* -------------------------------------------------------------------------- */
/* PLUG-IN SYSTEM                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Permet d’injecter dynamiquement de nouvelles stratégies
 * sans redémarrage du système.
 */
export function registerFraudStrategy(
  name: string,
  initializer: () => void
): void {
  try {
    initializer();
    console.info(`🧩 Fraud strategy registered: ${name}`);
  } catch (error) {
    console.error(
      `❌ Failed to register fraud strategy: ${name}`,
      error
    );
  }
}

/* -------------------------------------------------------------------------- */
/* SAFE SHUTDOWN                                                              */
/* -------------------------------------------------------------------------- */

export async function shutdownFraudSubsystem(): Promise<void> {
  console.warn("🛑 Shutting down Fraud Subsystem...");

  try {
    await FraudEngine.shutdown();
    fraudEventBus.removeAllListeners();
    status = "DEGRADED";
  } catch (error) {
    console.error("🔥 Fraud shutdown error", error);
  }
}
