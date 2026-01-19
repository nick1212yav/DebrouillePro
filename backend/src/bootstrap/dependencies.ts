/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE BOOTSTRAP — DEPENDENCIES (WORLD #1 FINAL)                      */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/bootstrap/dependencies.ts                              */
/* -------------------------------------------------------------------------- */

import { logger } from "../shared/logger";
import { ENV } from "../config";
import { getDatabaseInfo, initDatabase } from "../database";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type DependencyStatus = "healthy" | "unhealthy";

export interface DependencyCheckResult {
  name: string;
  status: DependencyStatus;
  latencyMs: number;
  meta?: Record<string, unknown>;
}

export interface DependencyChecker {
  name: string;
  critical: boolean;
  check: () => Promise<DependencyCheckResult>;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL CONFIG                                                            */
/* -------------------------------------------------------------------------- */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;
const DEPENDENCY_TIMEOUT_MS = 5_000;

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(`Timeout while checking dependency: ${label}`)
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(
    () => clearTimeout(timeoutHandle!)
  );
};

/**
 * Normalize any typed object into a safe structured log payload.
 * Prevents TS index signature errors while preserving data.
 */
const toLogMeta = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return { value };
};

/* -------------------------------------------------------------------------- */
/* DEPENDENCY REGISTRY                                                        */
/* -------------------------------------------------------------------------- */

const dependencyCheckers: readonly DependencyChecker[] = [
  {
    name: "database",
    critical: true,
    check: async (): Promise<DependencyCheckResult> => {
      const startedAt = Date.now();

      await initDatabase();
      const info = getDatabaseInfo();

      return {
        name: "database",
        status: "healthy",
        latencyMs: Date.now() - startedAt,
        meta: toLogMeta(info),
      };
    },
  },
];

/* -------------------------------------------------------------------------- */
/* SINGLE DEPENDENCY EXECUTION                                                */
/* -------------------------------------------------------------------------- */

const runDependencyCheck = async (
  checker: DependencyChecker
): Promise<DependencyCheckResult> => {
  const startedAt = Date.now();

  try {
    const result = await withTimeout(
      checker.check(),
      DEPENDENCY_TIMEOUT_MS,
      checker.name
    );

    return {
      ...result,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    logger.error("❌ Dependency check failed", {
      dependency: checker.name,
      error: toLogMeta(error),
    });

    return {
      name: checker.name,
      status: "unhealthy",
      latencyMs: Date.now() - startedAt,
      meta: {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    };
  }
};

/* -------------------------------------------------------------------------- */
/* RETRY STRATEGY                                                             */
/* -------------------------------------------------------------------------- */

const executeWithRetry = async (
  checker: DependencyChecker
): Promise<DependencyCheckResult> => {
  let lastResult: DependencyCheckResult | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    logger.info("🔄 Checking dependency", {
      dependency: checker.name,
      attempt,
      maxRetries: MAX_RETRIES,
    });

    const result = await runDependencyCheck(checker);
    lastResult = result;

    if (result.status === "healthy") {
      logger.info("✅ Dependency healthy", toLogMeta(result));
      return result;
    }

    if (attempt < MAX_RETRIES) {
      logger.warn("⏳ Retrying dependency check", {
        dependency: checker.name,
        attempt,
        delayMs: RETRY_DELAY_MS,
      });
      await sleep(RETRY_DELAY_MS);
    }
  }

  return lastResult!;
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API                                                                 */
/* -------------------------------------------------------------------------- */

export const checkDependencies = async (): Promise<
  DependencyCheckResult[]
> => {
  logger.info("🧩 Starting dependency validation", {
    environment: ENV.NODE_ENV,
  });

  const results: DependencyCheckResult[] = [];

  for (const checker of dependencyCheckers) {
    const result = await executeWithRetry(checker);
    results.push(result);

    if (
      checker.critical &&
      result.status !== "healthy"
    ) {
      logger.fatal(
        "🔥 Critical dependency unavailable — aborting startup",
        toLogMeta(result)
      );
      throw new Error(
        `Critical dependency failed: ${checker.name}`
      );
    }
  }

  logger.info("📊 Dependency validation summary", {
    results: results.map(toLogMeta),
  });

  return results;
};
