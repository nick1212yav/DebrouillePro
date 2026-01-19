/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE JOBS — TRUST JOBS (WORLD #1 FINAL)                             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/jobs/jobs/trust.jobs.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Evaluate trust signals asynchronously                                  */
/*   - Update trust scores deterministically                                   */
/*   - Detect abnormal patterns                                                */
/*   - Produce explainable trust metrics                                       */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic scoring                                                   */
/*   - Rule-based transparency                                                 */
/*   - Safe retries                                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { BaseJob, JobResult } from "../job.types";
import { registerJobHandler } from "../worker";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface TrustSignal {
  type:
    | "payment_success"
    | "payment_failure"
    | "identity_verified"
    | "report_received"
    | "positive_review";
  weight: number;
}

export interface TrustJobPayload {
  identityId: string;
  currentScore: number;
  signals: TrustSignal[];
}

/* -------------------------------------------------------------------------- */
/* INTERNAL STORE (SIMULATION)                                                */
/* -------------------------------------------------------------------------- */

/**
 * Simulated trust score store.
 * In production → DB / cache.
 */
const trustScores = new Map<string, number>();

/* -------------------------------------------------------------------------- */
/* SCORING ENGINE                                                             */
/* -------------------------------------------------------------------------- */

const clamp = (
  value: number,
  min = 0,
  max = 100
): number => Math.max(min, Math.min(max, value));

const computeTrustScore = (
  baseScore: number,
  signals: TrustSignal[]
): number => {
  const delta = signals.reduce(
    (sum, s) => sum + s.weight,
    0
  );

  return clamp(baseScore + delta);
};

/* -------------------------------------------------------------------------- */
/* ABNORMAL PATTERN DETECTION                                                 */
/* -------------------------------------------------------------------------- */

const detectAnomaly = (
  previous: number,
  next: number
): boolean => Math.abs(next - previous) > 40;

/* -------------------------------------------------------------------------- */
/* JOB HANDLER                                                                */
/* -------------------------------------------------------------------------- */

const handleTrustJob = async (
  job: BaseJob<TrustJobPayload>
): Promise<JobResult> => {
  const start = Date.now();
  const { identityId, currentScore, signals } =
    job.payload;

  logger.info("⭐ Trust evaluation started", {
    identityId,
    signalsCount: signals.length,
  });

  const newScore = computeTrustScore(
    currentScore,
    signals
  );

  const anomalyDetected = detectAnomaly(
    currentScore,
    newScore
  );

  trustScores.set(identityId, newScore);

  logger.info("✅ Trust score updated", {
    identityId,
    previous: currentScore,
    next: newScore,
    anomalyDetected,
  });

  return {
    success: true,
    durationMs: Date.now() - start,
    output: {
      identityId,
      previousScore: currentScore,
      newScore,
      anomalyDetected,
    },
  };
};

/* -------------------------------------------------------------------------- */
/* REGISTRATION                                                              */
/* -------------------------------------------------------------------------- */

registerJobHandler("trust.evaluate", handleTrustJob);
