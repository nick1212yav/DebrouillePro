/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE AUTH — AUTH ROUTES (WORLD #1 FINAL)                            */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/auth/auth.routes.ts                                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Définir le contrat HTTP public d’authentification                      */
/*   - Orchestrer middlewares & controllers                                  */
/*   - Garantir sécurité, versioning, stabilité                               */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Aucune logique métier                                                  */
/*   - Ordre des middlewares explicite                                        */
/*   - Observabilité prête                                                    */
/*   - Compatible Gateway / API / Mobile                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router, Request, Response } from "express";

import { AuthController } from "./auth.controller";
import {
  authMiddleware,
  requireAuth,
} from "./auth.middleware";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* META / CONTRACT                                                           */
/* -------------------------------------------------------------------------- */

/**
 * GET /auth/_meta
 * ➜ Décrit les capacités publiques du module Auth.
 * ➜ Utile pour gateway, monitoring, SDK.
 */
router.get("/_meta", (_req: Request, res: Response) => {
  res.status(200).json({
    module: "auth",
    version: "v1",
    capabilities: {
      login: true,
      refresh: true,
      logout: true,
      logoutAll: true,
    },
  });
});

/* -------------------------------------------------------------------------- */
/* PUBLIC ROUTES (GUEST AUTORISÉ)                                             */
/* -------------------------------------------------------------------------- */

/**
 * POST /auth/login
 * - Authentification par mot de passe / OTP / device
 * - Retourne accessToken + refreshToken
 */
router.post("/login", AuthController.login);

/**
 * POST /auth/refresh
 * - Rafraîchit une session via refreshToken
 */
router.post("/refresh", AuthController.refresh);

/* -------------------------------------------------------------------------- */
/* CONTEXT RESOLUTION                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Injection de l’identité serveur.
 * Toutes les routes suivantes bénéficient de req.identity.
 */
router.use(authMiddleware);

/* -------------------------------------------------------------------------- */
/* PROTECTED ROUTES                                                           */
/* -------------------------------------------------------------------------- */

/**
 * POST /auth/logout
 * - Révoque la session courante
 */
router.post(
  "/logout",
  requireAuth,
  AuthController.logout
);

/**
 * POST /auth/logout-all
 * - Révoque toutes les sessions utilisateur
 * - Sécurité maximale
 */
router.post(
  "/logout-all",
  requireAuth,
  AuthController.logoutAll
);

/* -------------------------------------------------------------------------- */
/* ROUTE SAFETY NET                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Fallback pour routes inconnues dans /auth.
 */
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "AUTH_ROUTE_NOT_FOUND",
      message: "Auth route not found",
    },
  });
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;
