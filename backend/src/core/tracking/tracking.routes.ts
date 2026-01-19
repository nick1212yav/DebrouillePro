/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRACKING — ROUTES (ULTRA FINAL)                                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/tracking/tracking.routes.ts                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer les endpoints Tracking via Gateway                              */
/*   - Garantir sécurité, traçabilité et stabilité contractuelle              */
/*                                                                            */
/*  PRINCIPES :                                                               */
/*   - Zero Trust                                                             */
/*   - Accès minimal par rôle                                                 */
/*   - Aucune fuite de données sensibles                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { TrackingController } from "./tracking.controller";

/* -------------------------------------------------------------------------- */
/* SECURITY MIDDLEWARES                                                       */
/* (seront connectés au AccessEngine)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Placeholder.
 * Ces middlewares seront reliés plus tard à access.engine.ts
 */
const requireSystem =
  (_req: any, _res: any, next: any) => next();

const requireAuditor =
  (_req: any, _res: any, next: any) => next();

const requireAdmin =
  (_req: any, _res: any, next: any) => next();

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* ========================================================================== */
/* READ — OBSERVABILITY                                                       */
/* ========================================================================== */

/**
 * GET /tracking/logs
 * Recherche avancée des logs.
 * Accès: AUDITOR | ADMIN | SYSTEM
 */
router.get(
  "/logs",
  requireAuditor,
  TrackingController.search
);

/**
 * GET /tracking/stats
 * Statistiques agrégées globales.
 * Accès: ADMIN | SYSTEM
 */
router.get(
  "/stats",
  requireAdmin,
  TrackingController.stats
);

/**
 * GET /tracking/export
 * Export légal (forensic).
 * Accès: ADMIN uniquement
 */
router.get(
  "/export",
  requireAdmin,
  TrackingController.export
);

/* ========================================================================== */
/* WRITE — SYSTEM                                                             */
/* ========================================================================== */

/**
 * POST /tracking/system-event
 * Injection d'événement système contrôlée.
 * Accès: SYSTEM uniquement
 */
router.post(
  "/system-event",
  requireSystem,
  TrackingController.systemEvent
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;
