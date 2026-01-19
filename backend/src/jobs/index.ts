/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE JOBS — PUBLIC EXPORT HUB (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/jobs/index.ts                                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for the async job engine                       */
/*   - Enforce architectural boundaries                                       */
/*   - Auto-register all job handlers                                          */
/*   - Stabilize contracts                                                     */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic initialization                                            */
/*   - No circular dependencies                                               */
/*   - Explicit exports only                                                  */
/*   - Type-safe                                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* JOB CONTRACTS                                                              */
/* -------------------------------------------------------------------------- */

export type {
  BaseJob,
  JobAck,
  JobHandler,
  JobPriority,
  JobCategory,
  JobStatus,
  RetryPolicy,
  JobResult,
} from "./job.types";

/* -------------------------------------------------------------------------- */
/* QUEUE ENGINE                                                               */
/* -------------------------------------------------------------------------- */

export {
  enqueueJob,
  dequeueJob,
  retryJob,
  getQueueStats,
  getDeadLetterJobs,
} from "./queue";

/* -------------------------------------------------------------------------- */
/* WORKER ENGINE                                                              */
/* -------------------------------------------------------------------------- */

export {
  startWorker,
  stopWorker,
  registerJobHandler,
} from "./worker";

/* -------------------------------------------------------------------------- */
/* AUTO-REGISTER JOB HANDLERS                                                 */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ IMPORTANT:
 * Importing these files has side effects:
 * They register their handlers automatically.
 *
 * This guarantees that:
 *   - All jobs are always registered at startup
 *   - No forgotten handler in production
 */

// Payment
import "./jobs/pay.jobs";

// Audit
import "./jobs/audit.jobs";

// Trust
import "./jobs/trust.jobs";

// AI
import "./jobs/ai.jobs";

// Notifications
import "./jobs/notifications.jobs";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import jobs from:
        import { enqueueJob, startWorker } from "@/jobs";

  ❌ Never deep import:
        "@/jobs/queue"
        "@/jobs/worker"
        "@/jobs/jobs/*"

  This guarantees:
   - Stable public contracts
   - Safe refactors
   - Deterministic initialization
   - Predictable scaling behavior
*/
