/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE BOOTSTRAP — SHUTDOWN (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/bootstrap/shutdown.ts                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Orchestrate graceful shutdown of the application                       */
/*   - Guarantee ordered resource cleanup                                     */
/*   - Prevent double shutdown                                                 */
/*   - Enforce safety timeout                                                  */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Idempotent shutdown                                                     */
/*   - Deterministic cleanup order                                             */
/*   - Observable lifecycle                                                   */
/*   - Forced exit protection                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { logger } from "../shared/logger";
import {
  markServiceShuttingDown,
  markServiceStopped,
} from "./health";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type ShutdownSignal =
  | "SIGINT"
  | "SIGTERM"
  | "UNCAUGHT_EXCEPTION"
  | "UNHANDLED_REJECTION"
  | "MANUAL";

/**
 * A shutdown hook represents one cleanup step executed during shutdown.
 */
export interface ShutdownHook {
  name: string;
  critical?: boolean;
  timeoutMs?: number;
  handler: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

const hooks: ShutdownHook[] = [];
let shuttingDown = false;
const GLOBAL_SHUTDOWN_TIMEOUT_MS = 20_000;

/* -------------------------------------------------------------------------- */
/* PUBLIC API — REGISTRATION                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Register a cleanup hook executed during shutdown.
 * Hooks are executed in reverse registration order (LIFO).
 */
export const registerShutdownHook = (
  hook: ShutdownHook
): void => {
  hooks.push(hook);

  logger.debug("🧩 Shutdown hook registered", {
    hook: hook.name,
  });
};

/* -------------------------------------------------------------------------- */
/* INTERNAL EXECUTION                                                         */
/* -------------------------------------------------------------------------- */

const executeHook = async (
  hook: ShutdownHook
): Promise<void> => {
  const timeoutMs = hook.timeoutMs ?? 5_000;

  logger.info("🧹 Executing shutdown hook", {
    hook: hook.name,
    timeoutMs,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Shutdown hook timeout exceeded: ${hook.name}`
        )
      );
    }, timeoutMs);
  });

  try {
    await Promise.race([
      hook.handler(),
      timeoutPromise,
    ]);
    logger.info("✅ Shutdown hook completed", {
      hook: hook.name,
    });
  } catch (error) {
    logger.error("❌ Shutdown hook failed", {
      hook: hook.name,
      error,
    });

    if (hook.critical) {
      throw error;
    }
  }
};

/* -------------------------------------------------------------------------- */
/* SHUTDOWN ORCHESTRATOR                                                      */
/* -------------------------------------------------------------------------- */

export const shutdownGracefully = async (
  signal: ShutdownSignal
): Promise<void> => {
  if (shuttingDown) {
    logger.warn("⚠️ Shutdown already in progress");
    return;
  }

  shuttingDown = true;
  markServiceShuttingDown();

  const startedAt = Date.now();

  logger.warn("🛑 Graceful shutdown initiated", {
    signal,
    hooksCount: hooks.length,
  });

  const forceExitTimer = setTimeout(() => {
    logger.fatal("⏱️ Forced shutdown timeout exceeded");
    process.exit(1);
  }, GLOBAL_SHUTDOWN_TIMEOUT_MS);

  try {
    /**
     * Hooks are executed in reverse order of registration (stack).
     */
    const executionQueue = [...hooks].reverse();

    for (const hook of executionQueue) {
      await executeHook(hook);
    }

    markServiceStopped();

    const durationMs = Date.now() - startedAt;

    logger.info("✅ Graceful shutdown completed", {
      durationMs,
    });

    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    logger.fatal("🔥 Shutdown aborted due to critical failure", {
      error,
    });

    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};
