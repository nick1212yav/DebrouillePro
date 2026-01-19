/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE OBSERVABILITY — PROFILING ENGINE (WORLD #1 FINAL)           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/observability/profiling.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Runtime performance profiling                                          */
/*   - CPU and memory snapshots                                               */
/*   - Function execution timing                                              */
/*   - Slow operation detection                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface ProfileSnapshot {
  memory: {
    rssMB: number;
    heapTotalMB: number;
    heapUsedMB: number;
  };
  cpu: {
    userMs: number;
    systemMs: number;
  };
  timestamp: string;
}

export interface TimedExecution<T> {
  result: T;
  durationMs: number;
}

/* -------------------------------------------------------------------------- */
/* MEMORY                                                                     */
/* -------------------------------------------------------------------------- */

export const captureMemorySnapshot =
  (): ProfileSnapshot["memory"] => {
    const mem = process.memoryUsage();

    return {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapTotalMB: Math.round(
        mem.heapTotal / 1024 / 1024
      ),
      heapUsedMB: Math.round(
        mem.heapUsed / 1024 / 1024
      ),
    };
  };

/* -------------------------------------------------------------------------- */
/* CPU                                                                        */
/* -------------------------------------------------------------------------- */

export const captureCpuSnapshot =
  (): ProfileSnapshot["cpu"] => {
    const cpu = process.cpuUsage();

    return {
      userMs: Math.round(cpu.user / 1000),
      systemMs: Math.round(cpu.system / 1000),
    };
  };

/* -------------------------------------------------------------------------- */
/* FULL SNAPSHOT                                                              */
/* -------------------------------------------------------------------------- */

export const captureProfileSnapshot =
  (): ProfileSnapshot => {
    const snapshot: ProfileSnapshot = {
      memory: captureMemorySnapshot(),
      cpu: captureCpuSnapshot(),
      timestamp: new Date().toISOString(),
    };

    logger.debug("🧪 Profile snapshot", snapshot);
    return snapshot;
  };

/* -------------------------------------------------------------------------- */
/* FUNCTION TIMING                                                            */
/* -------------------------------------------------------------------------- */

export const timeExecution = async <T>(
  label: string,
  fn: () => Promise<T>
): Promise<TimedExecution<T>> => {
  const start = Date.now();

  try {
    const result = await fn();
    const durationMs = Date.now() - start;

    logger.debug("⏱️ Execution timed", {
      label,
      durationMs,
    });

    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - start;

    logger.error("🔥 Timed execution failed", {
      label,
      durationMs,
      error: String(error),
    });

    throw error;
  }
};
