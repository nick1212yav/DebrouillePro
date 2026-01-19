/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE OBSERVABILITY — PUBLIC EXPORT HUB (WORLD #1 FINAL)          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/observability/index.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for all observability primitives              */
/*   - Enforce architectural boundaries                                       */
/*   - Centralize initialization                                              */
/*   - Stabilize contracts                                                     */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic exports                                                  */
/*   - Type-safe                                                             */
/*   - No deep imports                                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* LOGGER                                                                     */
/* -------------------------------------------------------------------------- */

export { logger } from "./logger";

/* -------------------------------------------------------------------------- */
/* METRICS                                                                    */
/* -------------------------------------------------------------------------- */

export {
  incrementCounter,
  setGauge,
  recordTimer,
  snapshotMetrics,
} from "./metrics";

/* -------------------------------------------------------------------------- */
/* TRACING                                                                    */
/* -------------------------------------------------------------------------- */

export {
  startTrace,
  startSpan,
  finishSpan,
} from "./tracing";

/* -------------------------------------------------------------------------- */
/* PROFILING                                                                  */
/* -------------------------------------------------------------------------- */

export {
  captureMemorySnapshot,
  captureCpuSnapshot,
  captureProfileSnapshot,
  timeExecution,
} from "./profiling";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import observability tools from:
        import { logger, snapshotMetrics } from "@/observability";

  ❌ Never deep import:
        "@/observability/logger"
        "@/observability/*"

  This guarantees:
   - Stable public contracts
   - Safe refactors
   - Deterministic behavior
*/
