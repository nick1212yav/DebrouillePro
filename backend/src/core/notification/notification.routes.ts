/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — ROUTES (WORLD #1 CANONICAL)                     */
/*  File: backend/src/core/notification/notification.routes.ts               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*  - Exposer les endpoints publics Notification                              */
/*  - Orchestrer middlewares : Gateway → Auth → Access → Controller           */
/*  - Garantir versioning, sécurité et traçabilité                            */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*  - Aucune logique métier ici                                               */
/*  - Ordre des middlewares explicite                                         */
/*  - Compatible Gateway & Observability                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { NotificationController } from "./notification.controller";

/* Security */
import { authMiddleware, requireAuth } from "../auth/auth.middleware";
import { accessGuard } from "../access/access.middleware";

/* Identity */
import {
  ModuleName,
  ModuleAction,
} from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* PUBLIC ROUTES (SYSTEM / WORKERS / WEBHOOKS)                                */
/* -------------------------------------------------------------------------- */
/**
 * Certaines notifications peuvent être déclenchées par :
 * - Workers internes
 * - Cron
 * - IA
 * - Webhooks
 *
 * Sécurisation possible via API Keys / mTLS plus tard.
 */

/**
 * POST /notifications
 * Dispatcher une notification.
 */
router.post(
  "/",
  NotificationController.dispatch
);

/* -------------------------------------------------------------------------- */
/* AUTH CONTEXT RESOLUTION                                                    */
/* -------------------------------------------------------------------------- */

router.use(authMiddleware);

/* -------------------------------------------------------------------------- */
/* PROTECTED ROUTES                                                           */
/* -------------------------------------------------------------------------- */

/**
 * GET /notifications/:id
 * Lecture sécurisée d’une notification.
 */
router.get(
  "/:id",
  requireAuth,
  accessGuard("notification" as ModuleName, "VIEW"),
  NotificationController.getById
);

/**
 * GET /notifications
 * Lister les notifications d’une cible.
 */
router.get(
  "/",
  requireAuth,
  accessGuard("notification" as ModuleName, "VIEW"),
  NotificationController.listByTarget
);

/**
 * GET /notifications/stats
 * Statistiques globales (admin / ops / IA).
 */
router.get(
  "/stats",
  requireAuth,
  accessGuard("notification" as ModuleName, "AUDIT"),
  NotificationController.getStats
);

/**
 * POST /notifications/retry
 * Relancer les notifications en échec.
 */
router.post(
  "/retry",
  requireAuth,
  accessGuard("notification" as ModuleName, "MANAGE"),
  NotificationController.retryPending
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Ordre des middlewares maîtrisé
 * ✔️ Compatible Gateway versioning
 * ✔️ Sécurité progressive (RBAC + Policies)
 * ✔️ Prêt pour exposition publique mondiale
 *
 * 👉 Aucun module n'est exposé directement sans Gateway.
 */
