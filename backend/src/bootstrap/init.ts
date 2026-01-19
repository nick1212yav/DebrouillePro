/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE BOOTSTRAP — INIT (WORLD #1 FINAL)                              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/bootstrap/init.ts                                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Orchestrate application startup lifecycle                              */
/*   - Validate infrastructure dependencies                                  */
/*   - Initialize core runtime services                                       */
/*   - Guarantee deterministic startup order                                  */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No partial startup                                                     */
/*   - Fail-fast on any critical failure                                      */
/*   - Observable boot process                                                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { logger } from "../shared/logger";
import { checkDependencies } from "./dependencies";
import { markServiceReady } from "./health";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface BootstrapContext {
  startedAt: number;
  environment: string;
}

/* -------------------------------------------------------------------------- */
/* BOOTSTRAP INITIALIZATION                                                   */
/* -------------------------------------------------------------------------- */

export const initializeApplication = async (): Promise<BootstrapContext> => {
  const startedAt = Date.now();

  logger.info("⚙️ Bootstrap initialization started");

  /* ====================================================================== */
  /* STEP 1 — DEPENDENCY VALIDATION                                         */
  /* ====================================================================== */

  logger.info("🔍 Checking infrastructure dependencies...");
  await checkDependencies();
  logger.info("✅ Dependencies validated");

  /* ====================================================================== */
  /* STEP 2 — CORE RUNTIME INITIALIZATION                                   */
  /* ====================================================================== */

  /**
   * Future extension point:
   *  - Cache warmup
   *  - Event bus bootstrap
   *  - Background workers bootstrap
   *  - Feature flag sync
   */

  logger.info("🧠 Core runtime initialized");

  /* ====================================================================== */
  /* STEP 3 — MARK SERVICE READY                                             */
  /* ====================================================================== */

  markServiceReady();

  const durationMs = Date.now() - startedAt;

  logger.info("🚀 Bootstrap completed successfully", {
    durationMs,
  });

  return {
    startedAt,
    environment: process.env.NODE_ENV ?? "unknown",
  };
};
