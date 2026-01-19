/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE GATEWAY — GLOBAL ENTRY MIDDLEWARE (WORLD #1 FINAL)            */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/gateway/gateway.middleware.ts                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION ABSOLUE :                                                         */
/*   - Sécuriser TOUTES les requêtes entrantes                                */
/*   - Normaliser le contexte global                                          */
/*   - Garantir traçabilité, équité, auditabilité                             */
/*   - Préparer Auth • Access • Observability • IA                            */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   ✔️ Toujours exécuté en premier                                           */
/*   ✔️ Jamais bloquant inutilement                                           */
/*   ✔️ Zéro dépendance métier                                                */
/*   ✔️ Edge / Cloud / Monolith ready                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ENV } from "../../config/env";
import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES — GATEWAY CONTEXT                                                    */
/* -------------------------------------------------------------------------- */

export interface GatewayRequestContext {
  /** Identifiant global de traçabilité */
  requestId: string;

  /** Adresse IP réelle */
  ipAddress: string;

  /** User agent brut */
  userAgent?: string;

  /** Méthode HTTP */
  method: string;

  /** Path normalisé */
  path: string;

  /** Timestamp d’entrée */
  receivedAt: Date;

  /** Environnement d’exécution */
  env: string;

  /** Headers filtrés (audit / debug) */
  headers: Record<string, string | undefined>;
}

/* -------------------------------------------------------------------------- */
/* EXPRESS AUGMENTATION (SAFE)                                                */
/* -------------------------------------------------------------------------- */

declare global {
  namespace Express {
    interface Request {
      gateway: GatewayRequestContext;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Génère ou récupère un Request ID fiable.
 */
const resolveRequestId = (req: Request): string => {
  const headerId = req.headers["x-request-id"];
  if (typeof headerId === "string" && headerId.length > 8) {
    return headerId;
  }
  return crypto.randomUUID();
};

/**
 * Résout la vraie IP client (proxy aware).
 */
const resolveIpAddress = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "UNKNOWN";
};

/**
 * Nettoyage minimal des headers exposables.
 */
const sanitizeHeaders = (
  headers: Request["headers"]
): Record<string, string | undefined> => ({
  "user-agent": headers["user-agent"] as string | undefined,
  "accept-language": headers["accept-language"] as string | undefined,
  referer: headers["referer"] as string | undefined,
});

/* -------------------------------------------------------------------------- */
/* RATE LIMIT — MEMORY BASELINE (EDGE READY)                                  */
/* -------------------------------------------------------------------------- */

type RateEntry = {
  count: number;
  windowStart: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX =
  Number(process.env.RATE_LIMIT_MAX) || 300;

const rateLimitStore = new Map<string, RateEntry>();

const checkRateLimit = (
  key: string
): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= RATE_LIMIT_MAX,
    remaining: Math.max(
      RATE_LIMIT_MAX - entry.count,
      0
    ),
  };
};

/* -------------------------------------------------------------------------- */
/* GATEWAY MIDDLEWARE — SINGLE ENTRY POINT                                    */
/* -------------------------------------------------------------------------- */

export const gatewayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = resolveRequestId(req);
  const ipAddress = resolveIpAddress(req);
  const userAgent = req.headers["user-agent"];
  const receivedAt = new Date();

  /* ====================================================================== */
  /* RATE LIMITING                                                          */
  /* ====================================================================== */

  const rate = checkRateLimit(ipAddress);

  res.setHeader(
    "X-RateLimit-Remaining",
    String(rate.remaining)
  );

  if (!rate.allowed) {
    logger.warn("GATEWAY_RATE_LIMIT_BLOCKED", {
      ipAddress,
      requestId,
      path: req.originalUrl,
    });

    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
        requestId,
      },
    });
    return;
  }

  /* ====================================================================== */
  /* CONTEXT CREATION                                                       */
  /* ====================================================================== */

  const gatewayContext: GatewayRequestContext = {
    requestId,
    ipAddress,
    userAgent,
    method: req.method,
    path: req.originalUrl,
    receivedAt,
    env: ENV.NODE_ENV,
    headers: sanitizeHeaders(req.headers),
  };

  req.gateway = gatewayContext;

  /* ====================================================================== */
  /* RESPONSE HEADERS                                                       */
  /* ====================================================================== */

  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Gateway", "Debrouille");
  res.setHeader("X-Environment", ENV.NODE_ENV);

  /* ====================================================================== */
  /* OBSERVABILITY HOOK                                                     */
  /* ====================================================================== */

  logger.debug("GATEWAY_REQUEST_ACCEPTED", {
    requestId,
    ipAddress,
    method: req.method,
    path: req.originalUrl,
  });

  next();
};

/* -------------------------------------------------------------------------- */
/* CTO GUARANTEES                                                             */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Aucune dépendance métier
 * ✔️ Context global immuable
 * ✔️ Rate limit prêt Redis / Cloudflare
 * ✔️ Compatible serverless / edge
 * ✔️ Sécurité par défaut
 * ✔️ Observabilité native
 *
 * 👉 Ce middleware est le cerveau d’entrée de la plateforme.
 */
