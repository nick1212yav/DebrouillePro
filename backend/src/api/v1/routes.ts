/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE API V1 — ROUTES (WORLD #1 FINAL)                               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/api/v1/routes.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Declare all public API v1 routes                                       */
/*   - Attach global middlewares                                               */
/*   - Mount business modules                                                  */
/*   - Provide health and introspection endpoints                              */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Version isolation                                                      */
/*   - Deterministic routing                                                   */
/*   - Observability ready                                                     */
/*   - Zero circular dependencies                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router, Request, Response } from "express";

import {
  rateLimitMiddleware,
} from "../../middlewares";

import {
  getHealthSnapshot,
} from "../../bootstrap";

import { ENV, API } from "../../config";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* GLOBAL MIDDLEWARES FOR V1                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Rate limiting applies to all public endpoints.
 */
router.use(rateLimitMiddleware);

/* -------------------------------------------------------------------------- */
/* META / INTROSPECTION                                                       */
/* -------------------------------------------------------------------------- */

/**
 * API Version metadata.
 * Used by clients for compatibility negotiation.
 */
router.get("/meta", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    api: {
      version: API.DEFAULT_VERSION,
      prefix: API.PREFIX,
      environment: ENV.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Service health snapshot.
 * Used by monitoring and orchestration layers.
 */
router.get("/health", (_req: Request, res: Response) => {
  const snapshot = getHealthSnapshot();

  res.status(200).json({
    success: true,
    health: snapshot,
  });
});

/* -------------------------------------------------------------------------- */
/* BUSINESS MODULE ROUTES                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Example module mounting pattern:
 *
 *   import userRoutes from "../../modules/user/routes";
 *   router.use("/users", userRoutes);
 *
 * All modules must respect:
 *   - REST semantics
 *   - Version isolation
 *   - No side effects at import time
 */

/* -------------------------------------------------------------------------- */
/* FALLBACK — V1 NOT FOUND                                                    */
/* -------------------------------------------------------------------------- */

router.use((req: Request, res: Response) => {
  logger.warn("🚧 V1 route not found", {
    method: req.method,
    path: req.originalUrl,
  });

  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "API v1 route not found",
      requestId: req.context?.requestId,
    },
  });
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;
