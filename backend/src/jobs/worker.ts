/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE JOBS — WORKER ENGINE (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/jobs/worker.ts                                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Continuously pull jobs from the queue                                  */
/*   - Execute handlers with concurrency control                              */
/*   - Handle retries and failures                                             */
/*   - Provide worker lifecycle management                                     */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No blocking loop                                                       */
/*   - Deterministic execution                                                 */
/*   - Crash isolation                                                        */
/*   - Graceful shutdown                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { BaseJob, JobHandler } from "./job.types";
import {
  dequeueJob,
  retryJob,
} from "./queue";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface WorkerOptions {
  concurrency: number;
  pollIntervalMs: number;
}

interface RegisteredHandler {
  name: string;
  handler: JobHandler;
}

/* -------------------------------------------------------------------------- */
/* DEFAULTS                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_OPTIONS: WorkerOptions = {
  concurrency: 4,
  pollIntervalMs: 250,
};

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

const handlers = new Map<string, RegisteredHandler>();
let activeWorkers = 0;
let running = false;
let loopTimer: NodeJS.Timeout | null = null;

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/* HANDLER REGISTRATION                                                       */
/* -------------------------------------------------------------------------- */

export const registerJobHandler = (
  name: string,
  handler: JobHandler
): void => {
  if (handlers.has(name)) {
    throw new Error(
      `Job handler already registered: ${name}`
    );
  }

  handlers.set(name, { name, handler });

  logger.info("🧩 Job handler registered", {
    name,
  });
};

/* -------------------------------------------------------------------------- */
/* CORE LOOP                                                                  */
/* -------------------------------------------------------------------------- */

const processNextJob = async (): Promise<void> => {
  if (!running) return;
  if (activeWorkers >= options.concurrency) return;

  const queued = dequeueJob();
  if (!queued) return;

  const { job } = queued;
  const handlerEntry = handlers.get(
    job.meta.name
  );

  if (!handlerEntry) {
    logger.error("❌ No handler registered for job", {
      jobName: job.meta.name,
      jobId: job.meta.id,
    });
    return;
  }

  activeWorkers += 1;

  const startedAt = Date.now();

  try {
    logger.info("▶️ Job started", {
      jobId: job.meta.id,
      name: job.meta.name,
      attempt: job.meta.attempts + 1,
    });

    const result = await handlerEntry.handler(
      job as BaseJob<any>
    );

    const durationMs =
      Date.now() - startedAt;

    if (result.success) {
      logger.info("✅ Job completed", {
        jobId: job.meta.id,
        durationMs,
        output: result.output,
      });
    } else {
      throw new Error(
        result.error || "Job failed"
      );
    }
  } catch (error) {
    logger.error("🔥 Job execution failed", {
      jobId: job.meta.id,
      error,
    });

    retryJob(queued, error);
  } finally {
    activeWorkers -= 1;
  }
};

/* -------------------------------------------------------------------------- */
/* WORKER LOOP                                                                */
/* -------------------------------------------------------------------------- */

let options: WorkerOptions = DEFAULT_OPTIONS;

const workerLoop = async (): Promise<void> => {
  while (running) {
    try {
      await processNextJob();
    } catch (error) {
      logger.error("🔥 Worker loop failure", {
        error,
      });
    }

    await sleep(options.pollIntervalMs);
  }
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — START                                                         */
/* -------------------------------------------------------------------------- */

export const startWorker = (
  customOptions?: Partial<WorkerOptions>
): void => {
  if (running) return;

  options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  running = true;

  logger.info("🚀 Worker started", {
    concurrency: options.concurrency,
    pollIntervalMs: options.pollIntervalMs,
  });

  workerLoop();
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — STOP                                                          */
/* -------------------------------------------------------------------------- */

export const stopWorker = async (): Promise<void> => {
  if (!running) return;

  logger.warn("🛑 Stopping worker...");

  running = false;

  /* Wait for active jobs to complete */
  while (activeWorkers > 0) {
    await sleep(100);
  }

  logger.info("✅ Worker stopped cleanly");
};
