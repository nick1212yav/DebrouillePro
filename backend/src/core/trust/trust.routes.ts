/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRUST — TRUST ROUTES (WORLD #1 GATEWAY CONTRACT)                */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/trust/trust.routes.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer les endpoints Trust via Gateway                                */
/*   - Garantir un contrat API stable                                         */
/*   - Séparer strictement public / admin                                     */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*   - Aucune logique métier                                                  */
/*   - Middleware explicite                                                   */
/*   - Routes lisibles et auditables                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { TrustController } from "./trust.controller";

import {
  authMiddleware,
  requireAuth,
} from "../auth/auth.middleware";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* GLOBAL MIDDLEWARE                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Résolution d'identité.
 * (Injecte req.identity)
 */
router.use(authMiddleware);

/* -------------------------------------------------------------------------- */
/* PUBLIC READ ROUTES                                                         */
/* -------------------------------------------------------------------------- */
/**
 * 👉 Consultables sans authentification stricte.
 * Utilisables par frontend public, widgets, IA, SEO.
 */

/**
 * GET /trust/score
 * - Récupère le TrustScore courant
 */
router.get(
  "/score",
  TrustController.getTrustScore
);

/**
 * GET /trust/history
 * - Historique public contrôlé
 */
router.get(
  "/history",
  TrustController.getTrustHistory
);

/**
 * GET /trust/meets-threshold
 * - Vérification logique (stateless)
 */
router.get(
  "/meets-threshold",
  TrustController.meetsThreshold
);

/* -------------------------------------------------------------------------- */
/* PROTECTED ADMIN ROUTES                                                     */
/* -------------------------------------------------------------------------- */
/**
 * 👉 Routes réservées monitoring / sécurité.
 * L’auth est obligatoire.
 */

/**
 * GET /trust/ledger/verify
 * - Vérifie l'intégrité du ledger Trust
 */
router.get(
  "/ledger/verify",
  requireAuth,
  TrustController.verifyLedgerIntegrity
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;
