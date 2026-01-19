/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE API — VERSION V1 PUBLIC HUB (WORLD #1 FINAL)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/api/v1/index.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single entrypoint for API v1 routing                                   */
/*   - Enforce version isolation                                              */
/*   - Stabilize public contracts                                             */
/*   - Enable future deprecation strategies                                  */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Explicit exports only                                                  */
/*   - No deep imports                                                        */
/*   - Predictable evolution                                                  */
/*   - Type-safe                                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import v1Router from "./routes";

/* -------------------------------------------------------------------------- */
/* PUBLIC EXPORT                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Canonical router for API version v1.
 * Mounted by the global API router.
 */
export const apiV1Router = v1Router;

export default apiV1Router;

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Only import v1 router from:
        import { apiV1Router } from "@/api/v1";

  ❌ Never deep import:
        "@/api/v1/routes"

  This guarantees:
   - Clean version boundaries
   - Easier deprecation strategy
   - Safer refactoring
*/
