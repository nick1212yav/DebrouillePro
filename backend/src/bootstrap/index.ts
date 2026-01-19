/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE BOOTSTRAP — PUBLIC LIFECYCLE HUB (WORLD #1 FINAL)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/bootstrap/index.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for application lifecycle                     */
/*   - Enforce clean dependency boundaries                                    */
/*   - Stabilize internal contracts                                            */
/*   - Prevent scattered deep imports                                          */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No circular dependencies                                               */
/*   - Explicit exports only                                                  */
/*   - Type-safe public API                                                   */
/*   - Long-term maintainability                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* INIT                                                                       */
/* -------------------------------------------------------------------------- */

export {
  initializeApplication,
  type BootstrapContext,
} from "./init";

/* -------------------------------------------------------------------------- */
/* HEALTH                                                                     */
/* -------------------------------------------------------------------------- */

export {
  getHealthSnapshot,
  isServiceLive,
  isServiceReady,
  markServiceReady,
  markServiceDegraded,
  markServiceShuttingDown,
  markServiceStopped,
  type HealthSnapshot,
  type ServiceStatus,
} from "./health";

/* -------------------------------------------------------------------------- */
/* DEPENDENCIES                                                               */
/* -------------------------------------------------------------------------- */

export {
  checkDependencies,
  type DependencyCheckResult,
  type DependencyChecker,
  type DependencyStatus,
} from "./dependencies";

/* -------------------------------------------------------------------------- */
/* SHUTDOWN                                                                   */
/* -------------------------------------------------------------------------- */

export {
  shutdownGracefully,
  registerShutdownHook,
  type ShutdownHook,
  type ShutdownSignal,
} from "./shutdown";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import lifecycle primitives from:
        import { initializeApplication, shutdownGracefully } from "@/bootstrap";

  ❌ Never deep import:
        "@/bootstrap/init"
        "@/bootstrap/shutdown"
        "@/bootstrap/health"
        "@/bootstrap/dependencies"

  This guarantees:
   - Stable public contracts
   - Refactor safety
   - Clean dependency graph
   - Predictable architecture evolution
*/
