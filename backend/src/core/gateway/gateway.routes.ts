/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE GATEWAY — GLOBAL API ROUTER (WORLD #1 FINAL)                  */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/gateway/gateway.routes.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION :                                                                 */
/*   - Point d’entrée UNIQUE du backend                                       */
/*   - Versioning strict des APIs                                             */
/*   - Isolation forte des domaines                                           */
/*   - Gouvernance globale                                                    */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   ✔️ Aucun module exposé directement                                       */
/*   ✔️ Versioning obligatoire                                                */
/*   ✔️ Routage déterministe                                                   */
/*   ✔️ Prêt microservices / monorepo                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router, Request, Response } from "express";
import { API } from "../../config/constants";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* CORE MODULE ROUTERS                                                        */
/* -------------------------------------------------------------------------- */

import authRoutes from "../auth/auth.routes";
// import profileRoutes from "../identity/profile.routes";
// import documentRoutes from "../doc/document.routes";
// import payRoutes from "../pay/pay.routes";
// import aiRoutes from "../ai/ai.routes";

/* -------------------------------------------------------------------------- */
/* ROUTER FACTORY                                                             */
/* -------------------------------------------------------------------------- */

const createVersionRouter = (
  version: string
): Router => {
  const router = Router();

  /* ====================================================================== */
  /* META                                                                    */
  /* ====================================================================== */

  router.get("/meta", (_req, res) => {
    res.status(200).json({
      success: true,
      version,
      apiPrefix: API.PREFIX,
      timestamp: new Date().toISOString(),
    });
  });

  /* ====================================================================== */
  /* MODULE BINDINGS                                                         */
  /* ====================================================================== */

  router.use("/auth", authRoutes);

  /**
   * Extensions futures (plug & play)
   *
   * router.use("/identity", identityRoutes)
   * router.use("/documents", documentRoutes)
   * router.use("/payments", payRoutes)
   * router.use("/ai", aiRoutes)
   */

  /* ====================================================================== */
  /* VERSION FALLBACK                                                        */
  /* ====================================================================== */

  router.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "API_ENDPOINT_NOT_FOUND",
        message: `Unknown endpoint for API ${version}`,
      },
    });
  });

  return router;
};

/* -------------------------------------------------------------------------- */
/* GATEWAY ROOT ROUTER                                                        */
/* -------------------------------------------------------------------------- */

const gatewayRouter = Router();

/* ========================================================================== */
/* PLATFORM HEALTH                                                            */
/* ========================================================================== */

gatewayRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: "Debrouille Gateway",
    status: "HEALTHY",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* ========================================================================== */
/* PLATFORM INFO                                                              */
/* ========================================================================== */

gatewayRouter.get("/info", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    name: "DebrouillePro Backend",
    description: "Unified backend platform",
    apiPrefix: API.PREFIX,
    supportedVersions: API.SUPPORTED_VERSIONS,
    defaultVersion: API.DEFAULT_VERSION,
    timestamp: new Date().toISOString(),
  });
});

/* ========================================================================== */
/* VERSION BINDING                                                            */
/* ========================================================================== */

for (const version of API.SUPPORTED_VERSIONS) {
  logger.info("API_VERSION_REGISTERED", { version });

  gatewayRouter.use(
    `/${version}`,
    createVersionRouter(version)
  );
}

/* ========================================================================== */
/* GLOBAL FALLBACK                                                            */
/* ========================================================================== */

gatewayRouter.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "API_VERSION_NOT_SUPPORTED",
      message:
        "Requested API version is not supported",
    },
  });
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default gatewayRouter;

/* -------------------------------------------------------------------------- */
/* CTO GUARANTEES                                                             */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Versioning strict
 * ✔️ Modules cloisonnés
 * ✔️ Aucun routage implicite
 * ✔️ Logs de gouvernance
 * ✔️ Zéro coupling métier
 * ✔️ Ready pour scaling mondial
 *
 * 👉 Ce router peut supporter des milliers de routes sans chaos.
 */
