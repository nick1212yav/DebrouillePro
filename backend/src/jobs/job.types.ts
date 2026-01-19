/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE JOBS — JOB TYPES (WORLD #1 FINAL)                              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/jobs/job.types.ts                                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Define the universal contract for async jobs                           */
/*   - Guarantee retryability and observability                               */
/*   - Enable future distributed execution                                    */
/*   - Enforce strong typing across producers and workers                     */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Immutable job contracts                                                */
/*   - Versioned payloads                                                     */
/*   - Deterministic execution metadata                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* JOB CATEGORIES                                                             */
/* -------------------------------------------------------------------------- */

export type JobCategory =
  | "system"
  | "payment"
  | "audit"
  | "trust"
  | "ai"
  | "notification"
  | "integration";

/* -------------------------------------------------------------------------- */
/* JOB PRIORITY                                                               */
/* -------------------------------------------------------------------------- */

export type JobPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

/* -------------------------------------------------------------------------- */
/* JOB STATUS                                                                 */
/* -------------------------------------------------------------------------- */

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "dead";

/* -------------------------------------------------------------------------- */
/* RETRY POLICY                                                               */
/* -------------------------------------------------------------------------- */

export interface RetryPolicy {
  maxAttempts: number;
  /**
   * Initial delay before first retry (ms).
   */
  initialDelayMs: number;

  /**
   * Exponential backoff factor.
   */
  backoffMultiplier: number;

  /**
   * Maximum delay between retries (ms).
   */
  maxDelayMs: number;
}

/* -------------------------------------------------------------------------- */
/* JOB METADATA                                                               */
/* -------------------------------------------------------------------------- */

export interface JobMeta {
  id: string;
  name: string;
  category: JobCategory;
  priority: JobPriority;
  version: number;

  createdAt: number;
  scheduledAt?: number;
  attempts: number;

  correlation?: {
    requestId?: string;
    traceId?: string;
    parentJobId?: string;
  };
}

/* -------------------------------------------------------------------------- */
/* JOB PAYLOAD                                                                */
/* -------------------------------------------------------------------------- */

export type JobPayload = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* BASE JOB                                                                   */
/* -------------------------------------------------------------------------- */

export interface BaseJob<TPayload = JobPayload> {
  meta: JobMeta;
  payload: TPayload;
}

/* -------------------------------------------------------------------------- */
/* JOB RESULT                                                                 */
/* -------------------------------------------------------------------------- */

export interface JobResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

/* -------------------------------------------------------------------------- */
/* JOB HANDLER                                                                */
/* -------------------------------------------------------------------------- */

export type JobHandler<TPayload = JobPayload> = (
  job: BaseJob<TPayload>
) => Promise<JobResult>;

/* -------------------------------------------------------------------------- */
/* JOB ACK                                                                    */
/* -------------------------------------------------------------------------- */

export interface JobAck {
  jobId: string;
  accepted: boolean;
  queuedAt: number;
}
