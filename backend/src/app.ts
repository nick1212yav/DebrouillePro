/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE APP — APPLICATION CORE (WORLD #1 FINAL)                        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/app.ts                                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Express application factory                                           */
/*   - Global security hardening                                              */
/*   - Middlewares orchestration                                              */
/*   - API mounting                                                          */
/*   - Health & diagnostics endpoints                                        */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Zero side-effects on import                                            */
/*   - Strict typing                                                         */
/*   - Deterministic startup                                                  */
/*   - Production-ready                                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

import { ENV } from "./config/env";
import { API } from "./config/constants";

/* -------------------------------------------------------------------------- */
/* OBSERVABILITY                                                              */
/* -------------------------------------------------------------------------- */

import { logger } from "./shared/logger";

/* -------------------------------------------------------------------------- */
/* MIDDLEWARES                                                                */
/* -------------------------------------------------------------------------- */

import { requestContextMiddleware } from "./middlewares/requestContext";
import { authMiddleware } from "./core/auth/auth.middleware";
import { errorHandler } from "./middlewares/errorHandler";

/* -------------------------------------------------------------------------- */
/* API ROUTER                                                                 */
/* -------------------------------------------------------------------------- */

import { apiRouter } from "./api";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface HealthResponse {
  name: string;
  status: "RUNNING";
  environment: string;
  version: string;
  uptime: number;
  timestamp: string;
  api: {
    prefix: string;
    defaultVersion: string;
  };
}

/* -------------------------------------------------------------------------- */
/* APPLICATION FACTORY                                                        */
/* -------------------------------------------------------------------------- */

export const createApp = (): Application => {
  const app = express();

  /* ====================================================================== */
  /* PLATFORM HARDENING                                                     */
  /* ====================================================================== */

  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
    })
  );

  app.use(
    cors({
      origin: ENV.CORS_ORIGINS,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
        "X-Trace-Id",
      ],
      maxAge: 86400,
    })
  );

  /* ====================================================================== */
  /* BODY PARSERS                                                           */
  /* ====================================================================== */

  app.use(express.json({ limit: "10mb" }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: "10mb",
    })
  );

  /* ====================================================================== */
  /* CONTEXT ENRICHMENT (ORDER MATTERS)                                     */
  /* ====================================================================== */

  app.use(requestContextMiddleware);
  app.use(authMiddleware);

  /* ====================================================================== */
  /* HEALTH & DIAGNOSTICS                                                   */
  /* ====================================================================== */

  app.get("/health", (_req: Request, res: Response<HealthResponse>) => {
    const payload: HealthResponse = {
      name: "Debrouille Backend",
      status: "RUNNING",
      environment: ENV.NODE_ENV,
      version: ENV.APP_VERSION,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      api: {
        prefix: API.PREFIX,
        defaultVersion: API.DEFAULT_VERSION,
      },
    };

    res.status(200).json(payload);
  });

  /* ====================================================================== */
  /* API MOUNTING                                                           */
  /* ====================================================================== */

  app.use(API.PREFIX, apiRouter);

  /* ====================================================================== */
  /* 404 HANDLER                                                             */
  /* ====================================================================== */

  app.use((req: Request, res: Response) => {
    const requestId =
      (req as unknown as { context?: { requestId?: string } })?.context
        ?.requestId ?? "unknown";

    res.status(404).json({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} not found`,
        requestId,
      },
    });
  });

  /* ====================================================================== */
  /* GLOBAL ERROR HANDLER                                                   */
  /* ====================================================================== */

  app.use(errorHandler);

  /* ====================================================================== */
  /* FINAL BOOT LOG                                                         */
  /* ====================================================================== */

  logger.info("🚀 Application initialized", {
    env: ENV.NODE_ENV,
    version: ENV.APP_VERSION,
    apiPrefix: API.PREFIX,
  });

  return app;
};
