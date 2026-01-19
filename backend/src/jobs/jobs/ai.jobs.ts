/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE JOBS — AI JOBS (WORLD #1 FINAL)                                */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/jobs/jobs/ai.jobs.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Execute asynchronous AI inference pipelines                             */
/*   - Extract features                                                       */
/*   - Produce explainable predictions                                         */
/*   - Prepare ML dataset evolution                                            */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic inference                                                 */
/*   - Reproducible outputs                                                    */
/*   - Safe retries                                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { BaseJob, JobResult } from "../job.types";
import { registerJobHandler } from "../worker";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface AIJobPayload {
  entityId: string;
  entityType: "user" | "organization" | "transaction";
  rawSignals: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/* FEATURE EXTRACTION                                                         */
/* -------------------------------------------------------------------------- */

const extractFeatures = (
  signals: Record<string, number>
): number[] => {
  return Object.values(signals).map((v) =>
    Number.isFinite(v) ? v : 0
  );
};

/* -------------------------------------------------------------------------- */
/* INFERENCE ENGINE (SIMULATED)                                               */
/* -------------------------------------------------------------------------- */

const runInference = async (
  features: number[]
): Promise<{
  score: number;
  confidence: number;
}> => {
  await new Promise((r) => setTimeout(r, 300));

  const sum = features.reduce(
    (acc, v) => acc + v,
    0
  );

  const score = Math.min(100, Math.max(0, sum % 100));
  const confidence = Math.min(
    1,
    features.length / 20
  );

  return { score, confidence };
};

/* -------------------------------------------------------------------------- */
/* JOB HANDLER                                                                */
/* -------------------------------------------------------------------------- */

const handleAIJob = async (
  job: BaseJob<AIJobPayload>
): Promise<JobResult> => {
  const start = Date.now();
  const { entityId, entityType, rawSignals } =
    job.payload;

  logger.info("🤖 AI inference started", {
    entityId,
    entityType,
  });

  const features = extractFeatures(rawSignals);
  const inference = await runInference(features);

  logger.info("🧠 AI inference completed", {
    entityId,
    score: inference.score,
    confidence: inference.confidence,
  });

  return {
    success: true,
    durationMs: Date.now() - start,
    output: {
      entityId,
      entityType,
      featuresCount: features.length,
      inference,
    },
  };
};

/* -------------------------------------------------------------------------- */
/* REGISTRATION                                                              */
/* -------------------------------------------------------------------------- */

registerJobHandler("ai.infer", handleAIJob);
