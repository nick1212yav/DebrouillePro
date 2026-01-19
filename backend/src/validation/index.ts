/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE VALIDATION — PUBLIC EXPORT HUB (WORLD #1 FINAL)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/validation/index.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for all validation contracts                  */
/*   - Centralize schema helpers                                              */
/*   - Enforce architectural boundaries                                       */
/*   - Provide stable APIs                                                    */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic exports                                                  */
/*   - Type-safe                                                             */
/*   - No deep imports                                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* CORE ZOD UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

export { z, validateSchema } from "./zod";

/* -------------------------------------------------------------------------- */
/* SCHEMAS                                                                    */
/* -------------------------------------------------------------------------- */

export * from "./schemas";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import validation tools from:
        import { validateSchema, loginSchema } from "@/validation";

  ❌ Never deep import:
        "@/validation/zod"
        "@/validation/schemas/*"

  This guarantees:
   - Stable contracts
   - Safe refactors
   - Predictable typing
*/
