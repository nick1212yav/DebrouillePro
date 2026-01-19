/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE API — GLOBAL ROUTER (WORLD #1 FINAL)                           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/api/index.ts                                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single entrypoint for all public API versions                          */
/*   - Enforce version isolation and routing governance                       */
/*   - Provide forward compatibility for future versions                     */
/*   - Centralize observability and protection layers                         */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Deterministic routing                                                  */
/*   - No accidental version exposure                                        */
/*   - Explicit version contracts                                             */
/*   - Zero circular dependencies                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router, Request, Response } from "express";

import { API } from "../config";
import { logger } from "../shared/logger";

import { apiV1Router } from "./v1";
import { apiV2Router } from "./v2";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* VERSION REGISTRY                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Central registry of all API versions.
 * This allows dynamic mounting and future automation (metrics, deprecation).
 */
const VERSION_REGISTRY = {
  v1: apiV1Router,
  v2: apiV2Router,
} as const;

/* -------------------------------------------------------------------------- */
/* API ROOT METADATA                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Root API endpoint.
 * Useful for discovery, debugging and observability.
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    platform: "DebrouillePro",
    api: {
      prefix: API.PREFIX,
      defaultVersion: API.DEFAULT_VERSION,
      supportedVersions: API.SUPPORTED_VERSIONS,
    },
    timestamp: new Date().toISOString(),
  });
});

/* -------------------------------------------------------------------------- */
/* VERSION MOUNTING                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Mount all declared API versions explicitly.
 * This avoids accidental exposure of experimental versions.
 */
(Object.entries(VERSION_REGISTRY) as Array<
  [keyof typeof VERSION_REGISTRY, Router]
>).forEach(([version, versionRouter]) => {
  logger.info("🌐 Mounting API version", {
    version,
  });

  router.use(`/${version}`, versionRouter);
});

/* -------------------------------------------------------------------------- */
/* VERSION FALLBACK                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Catch invalid API versions early.
 * Example: /api/v99/anything
 */
router.use("/:version", (req: Request, res: Response) => {
  const requestedVersion = req.params.version;

  logger.warn("🚫 Unsupported API version requested", {
    version: requestedVersion,
    path: req.originalUrl,
  });

  res.status(404).json({
    success: false,
    error: {
      code: "UNSUPPORTED_API_VERSION",
      message: `API version '${requestedVersion}' is not supported`,
      supportedVersions: API.SUPPORTED_VERSIONS,
      requestId: req.context?.requestId,
    },
  });
});

/* -------------------------------------------------------------------------- */
/* GLOBAL FALLBACK                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Any route reaching here is invalid inside /api namespace.
 */
router.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "API_ROUTE_NOT_FOUND",
      message: "API route not found",
    },
  });
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const apiRouter = router;
export default apiRouter;

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always mount API from:
        import { apiRouter } from "@/api";

  ❌ Never mount version routers directly in app.ts:
        apiV1Router
        apiV2Router

  This guarantees:
   - Version governance
   - Centralized observability
   - Predictable routing behavior
   - Safe long-term evolution
*/
