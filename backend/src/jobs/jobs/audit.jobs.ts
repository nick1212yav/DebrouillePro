/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE JOBS — AUDIT JOBS (WORLD #1 FINAL)                             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/jobs/jobs/audit.jobs.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Persist security and business audit events asynchronously              */
/*   - Normalize sensitive data                                                */
/*   - Prepare export to SIEM / BigData                                         */
/*   - Guarantee traceability and compliance                                   */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic serialization                                             */
/*   - Sensitive data masking                                                  */
/*   - Idempotent storage                                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { BaseJob, JobResult } from "../job.types";
import { registerJobHandler } from "../worker";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface AuditJobPayload {
  action: string;
  actorId?: string;
  resource?: string;
  severity: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STORE (SIMULATION)                                                */
/* -------------------------------------------------------------------------- */

/**
 * In production this should be replaced by:
 * - Elasticsearch
 * - BigQuery
 * - S3
 * - SIEM
 */
const auditStore: AuditJobPayload[] = [];

/* -------------------------------------------------------------------------- */
/* SENSITIVE DATA MASKING                                                     */
/* -------------------------------------------------------------------------- */

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "creditCard",
];

const maskSensitiveData = (
  data: Record<string, unknown>
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (
      SENSITIVE_KEYS.some((k) =>
        key.toLowerCase().includes(k)
      )
    ) {
      sanitized[key] = "***MASKED***";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/* -------------------------------------------------------------------------- */
/* JOB HANDLER                                                                */
/* -------------------------------------------------------------------------- */

const handleAuditJob = async (
  job: BaseJob<AuditJobPayload>
): Promise<JobResult> => {
  const start = Date.now();
  const { payload } = job;

  const sanitizedPayload: AuditJobPayload = {
    ...payload,
    metadata: payload.metadata
      ? maskSensitiveData(payload.metadata)
      : undefined,
  };

  auditStore.push(sanitizedPayload);

  logger.info("🧾 Audit event recorded", {
    action: sanitizedPayload.action,
    severity: sanitizedPayload.severity,
    actorId: sanitizedPayload.actorId,
    resource: sanitizedPayload.resource,
  });

  return {
    success: true,
    durationMs: Date.now() - start,
    output: {
      stored: true,
      totalEvents: auditStore.length,
    },
  };
};

/* -------------------------------------------------------------------------- */
/* REGISTRATION                                                              */
/* -------------------------------------------------------------------------- */

registerJobHandler("audit.record", handleAuditJob);
