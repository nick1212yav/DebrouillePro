/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE API — VERSION V2 SANDBOX (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/api/v2/index.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Prepare future API evolution                                           */
/*   - Enable experimental endpoints                                          */
/*   - Allow canary releases and migrations                                   */
/*   - Preserve backward compatibility                                       */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Explicit contract placeholder                                          */
/*   - No breaking change leakage                                             */
/*   - Safe activation via feature flags                                      */
/*   - Zero side effects                                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router, Request, Response } from "express";

import { isFeatureEnabled } from "../../config";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* FEATURE GATE                                                               */
/* -------------------------------------------------------------------------- */

/**
 * V2 endpoints are gated behind a feature flag.
 * They must NEVER be exposed accidentally in production.
 */
router.use((req, res, next) => {
  if (!isFeatureEnabled("EXPERIMENTAL_FEATURES_ENABLED")) {
    logger.warn("🚧 API v2 access blocked by feature flag", {
      path: req.originalUrl,
      ip: req.ip,
    });

    return res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "API v2 is not enabled",
      },
    });
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* PLACEHOLDER ENDPOINT                                                       */
/* -------------------------------------------------------------------------- */

router.get("/status", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    api: {
      version: "v2",
      status: "experimental",
    },
    timestamp: new Date().toISOString(),
  });
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const apiV2Router = router;
export default apiV2Router;
