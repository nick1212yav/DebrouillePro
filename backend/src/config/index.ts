/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CONFIG — CANONICAL EXPORT HUB (WORLD #1 FINAL)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/config/index.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single entrypoint for all configuration access                         */
/*   - Prevent scattered imports across the codebase                          */
/*   - Guarantee immutability and consistency                                 */
/*   - Enforce governance over configuration usage                            */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - No circular dependency                                                  */
/*   - Explicit exports                                                       */
/*   - Stable public contract                                                  */
/*   - Tree-shake friendly                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* ENVIRONMENT                                                                */
/* -------------------------------------------------------------------------- */

export { ENV, type NodeEnv } from "./env";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

export {
  API,
  PAGINATION,
  SECURITY,
  FILES,
  PAY,
  TRUST,
  DOCUMENTS,
  AI,
  TRACKING,
  TIME,
  SYSTEM,
} from "./constants";

/* -------------------------------------------------------------------------- */
/* FEATURE FLAGS                                                              */
/* -------------------------------------------------------------------------- */

export {
  FEATURES,
  isFeatureEnabled,
  type FeatureKey,
  type FeatureDefinition,
} from "./features";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE NOTES                                                           */
/* -------------------------------------------------------------------------- */
/*
  Usage rules across the codebase:

  ✅ Always import configuration from:
        import { ENV, API, FEATURES } from "@/config";

  ❌ Never import directly from:
        "@/config/env"
        "@/config/constants"
        "@/config/features"

  This guarantees:
   - Centralized dependency graph
   - Easier refactoring
   - Safer contracts
   - Cleaner architecture boundaries
*/
