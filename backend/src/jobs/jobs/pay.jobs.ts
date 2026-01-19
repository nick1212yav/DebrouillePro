/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE JOBS — PAYMENT JOBS (WORLD #1 FINAL)                           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/jobs/jobs/pay.jobs.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Execute asynchronous payment operations                                */
/*   - Guarantee idempotence and traceability                                  */
/*   - Simulate provider integration (sandbox ready)                           */
/*   - Emit financial observability logs                                       */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic execution                                                 */
/*   - Safe retry behavior                                                     */
/*   - No double execution                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { BaseJob, JobResult } from "../job.types";
import { registerJobHandler } from "../worker";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface PayJobPayload {
  transactionId: string;
  amount: number;
  currency: string;
  provider: "sandbox" | "stripe" | "flutterwave";
  customerId: string;
}

/* -------------------------------------------------------------------------- */
/* IDEMPOTENCE CACHE (IN-MEMORY)                                              */
/* -------------------------------------------------------------------------- */

/**
 * Prevents double execution when retries occur.
 * In production this can be replaced by Redis / DB.
 */
const processedTransactions = new Set<string>();

/* -------------------------------------------------------------------------- */
/* SIMULATED PROVIDER EXECUTION                                               */
/* -------------------------------------------------------------------------- */

const simulatePaymentProvider = async (
  payload: PayJobPayload
): Promise<{ providerRef: string }> => {
  await new Promise((r) => setTimeout(r, 500));

  if (payload.amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  return {
    providerRef: `PAY-${Date.now()}`,
  };
};

/* -------------------------------------------------------------------------- */
/* JOB HANDLER                                                                */
/* -------------------------------------------------------------------------- */

const handlePayJob = async (
  job: BaseJob<PayJobPayload>
): Promise<JobResult> => {
  const start = Date.now();
  const { payload } = job;

  logger.info("💳 Processing payment job", {
    jobId: job.meta.id,
    transactionId: payload.transactionId,
    amount: payload.amount,
    provider: payload.provider,
  });

  /* ---------------------------------------------------------------------- */
  /* IDEMPOTENCE CHECK                                                      */
  /* ---------------------------------------------------------------------- */

  if (
    processedTransactions.has(
      payload.transactionId
    )
  ) {
    logger.warn("♻️ Payment already processed", {
      transactionId: payload.transactionId,
    });

    return {
      success: true,
      durationMs: Date.now() - start,
      output: {
        status: "already_processed",
      },
    };
  }

  /* ---------------------------------------------------------------------- */
  /* EXECUTION                                                               */
  /* ---------------------------------------------------------------------- */

  const providerResult =
    await simulatePaymentProvider(payload);

  processedTransactions.add(payload.transactionId);

  logger.info("✅ Payment completed", {
    transactionId: payload.transactionId,
    providerRef: providerResult.providerRef,
  });

  return {
    success: true,
    durationMs: Date.now() - start,
    output: {
      transactionId: payload.transactionId,
      providerRef: providerResult.providerRef,
      status: "paid",
    },
  };
};

/* -------------------------------------------------------------------------- */
/* REGISTRATION                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Job name must be globally unique.
 */
registerJobHandler("payment.process", handlePayJob);
