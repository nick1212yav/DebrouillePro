/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD ROUTES (GLOBAL SECURE GATEWAY)                      */
/*  File: backend/src/core/pay/fraud.routes.ts                                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  OBJECTIFS :                                                               */
/*  - Exposer les endpoints antifraude                                         */
/*  - Sécuriser chaque appel                                                   */
/*  - Versionner l’API                                                        */
/*  - Appliquer rate limit & protection                                       */
/*  - Préparer edge / mobile / partenaires                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { FraudController } from "./fraud.controller";

import { authMiddleware } from "../auth/auth.middleware";
import { accessMiddleware } from "../access/access.middleware";
import { requestContextMiddleware } from "../context/request.context";

/* -------------------------------------------------------------------------- */
/* ROUTER INITIALIZATION                                                      */
/* -------------------------------------------------------------------------- */

export const fraudRouter = Router();

/* -------------------------------------------------------------------------- */
/* GLOBAL MIDDLEWARES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Injection du contexte global
 * - requestId
 * - identity
 * - ip
 * - tracking context
 */
fraudRouter.use(requestContextMiddleware);

/**
 * Authentification obligatoire
 */
fraudRouter.use(authMiddleware);

/**
 * Autorisation centralisée
 */
fraudRouter.use(accessMiddleware);

/* -------------------------------------------------------------------------- */
/* RATE LIMIT (SOFT PROTECTION)                                                */
/* -------------------------------------------------------------------------- */

/**
 * Anti-abuse léger (ex: 60 req / min / identity)
 * Implémentation volontairement simple ici.
 */
const rateLimitWindowMs = 60_000;
const rateLimitMax = 60;

const rateBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();

fraudRouter.use((req, res, next) => {
  const key =
    req.context.identity?.id ||
    req.ip ||
    "anonymous";

  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + rateLimitWindowMs,
    });
    return next();
  }

  if (bucket.count >= rateLimitMax) {
    return res.status(429).json({
      error: "RATE_LIMIT_EXCEEDED",
      retryAfterMs: bucket.resetAt - now,
    });
  }

  bucket.count++;
  next();
});

/* -------------------------------------------------------------------------- */
/* API VERSIONING                                                             */
/* -------------------------------------------------------------------------- */

const v1 = Router();
fraudRouter.use("/v1", v1);

/* -------------------------------------------------------------------------- */
/* ROUTES                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * 🔎 Analyse antifraude instantanée
 * GET /fraud/v1/analyze?identityId=xxx
 */
v1.get(
  "/analyze",
  FraudController.analyze
);

/**
 * 👀 Observation antifraude (ingestion événement)
 * POST /fraud/v1/observe
 */
v1.post(
  "/observe",
  FraudController.observe
);

/**
 * 🧠 Recommandation consolidée
 * GET /fraud/v1/recommendation?identityId=xxx
 */
v1.get(
  "/recommendation",
  FraudController.recommendation
);

/**
 * ❤️ Health check
 * GET /fraud/v1/health
 */
v1.get(
  "/health",
  FraudController.health
);

/* -------------------------------------------------------------------------- */
/* FUTURE EXTENSIONS                                                          */
/* -------------------------------------------------------------------------- */
/**
 * - /v2 -> streaming realtime
 * - /v3 -> federated ML
 * - /edge -> edge inference
 * - /partner -> trusted API
 * - /sandbox -> simulation
 */
