/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PROFILE — PROFILE ROUTES (WORLD #1 CANONICAL)                   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/profile/profile.routes.ts                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Exposer l’API publique du module Profile                                */
/*   - Orchestrer Auth + Access + Controller                                   */
/*   - Garantir un contrat stable pour 10+ ans                                  */
/*                                                                            */
/*  INTERDICTIONS :                                                           */
/*   - Aucune logique métier ici                                               */
/*   - Aucune validation métier ici                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { ProfileController } from "./profile.controller";
import { authMiddleware, requireAuth } from "../auth/auth.middleware";
import { accessGuard } from "../access/access.middleware";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* PUBLIC ROUTES                                                              */
/* -------------------------------------------------------------------------- */
/**
 * 🌍 Routes accessibles sans authentification.
 * - Lecture publique
 * - Découverte
 * - Recherche
 */

/**
 * GET /profiles/search?q=...
 * Recherche publique de profils.
 */
router.get(
  "/search",
  ProfileController.searchProfiles
);

/**
 * GET /profiles/discover
 * Découverte intelligente de profils.
 */
router.get(
  "/discover",
  ProfileController.discoverProfiles
);

/**
 * GET /profiles/username/:username
 * Accès public par handle.
 */
router.get(
  "/username/:username",
  ProfileController.getProfileByUsername
);

/**
 * GET /profiles/:id
 * Accès public sécurisé par ID.
 */
router.get(
  "/:id",
  ProfileController.getProfileById
);

/* -------------------------------------------------------------------------- */
/* AUTHENTICATED ROUTES                                                       */
/* -------------------------------------------------------------------------- */
/**
 * 🔐 Routes nécessitant une identité.
 */

router.use(authMiddleware);

/**
 * POST /profiles
 * Création du profil.
 */
router.post(
  "/",
  requireAuth,
  accessGuard("profile", "CREATE"),
  ProfileController.createProfile
);

/**
 * PATCH /profiles/:id
 * Mise à jour du profil.
 */
router.patch(
  "/:id",
  requireAuth,
  accessGuard("profile", "UPDATE"),
  ProfileController.updateProfile
);

/**
 * PATCH /profiles/:id/visibility
 * Modification de la visibilité.
 */
router.patch(
  "/:id/visibility",
  requireAuth,
  accessGuard("profile", "MANAGE"),
  ProfileController.updateVisibility
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ API stable et versionnable
 * ✔️ Sécurité multi-couches (Gateway → Auth → Access)
 * ✔️ Aucun couplage métier
 * ✔️ Observabilité native
 * ✔️ Mobile-ready / Partner-ready
 *
 * 👉 Prêt pour trafic mondial.
 */
