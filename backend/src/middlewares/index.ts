/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE MIDDLEWARES — PUBLIC EXPORT HUB (WORLD #1 FINAL)               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/middlewares/index.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for all HTTP middlewares                      */
/*   - Enforce architectural boundaries                                      */
/*   - Prevent deep imports                                                    */
/*   - Stabilize long-term contracts                                          */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Explicit exports only                                                  */
/*   - No circular dependencies                                               */
/*   - Type-safe contracts                                                    */
/*   - Predictable evolution                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* REQUEST CONTEXT                                                           */
/* -------------------------------------------------------------------------- */

export {
  requestContextMiddleware,
  type RequestContext,
  type RequestIdentityContext,
  type DeviceType,
} from "./requestContext";

/* -------------------------------------------------------------------------- */
/* RATE LIMITING                                                             */
/* -------------------------------------------------------------------------- */

export { rateLimitMiddleware } from "./rateLimit";

/* -------------------------------------------------------------------------- */
/* ERROR HANDLING                                                            */
/* -------------------------------------------------------------------------- */

export {
  errorHandler,
  AppError,
  type ApiErrorPayload,
  type ErrorCode,
} from "./errorHandler";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                */
/* -------------------------------------------------------------------------- */
/*
  Usage rules across the codebase:

  ✅ Always import middlewares from:
        import { requestContextMiddleware, errorHandler } from "@/middlewares";

  ❌ Never deep import:
        "@/middlewares/requestContext"
        "@/middlewares/rateLimit"
        "@/middlewares/errorHandler"

  This guarantees:
   - Stable contracts
   - Clean dependency graph
   - Safe refactors
   - Predictable architecture growth
*/
