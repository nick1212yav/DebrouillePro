/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CONSENT ROUTES (WORLD #1 GATEWAY FIREWALL)       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/consent/consent.routes.ts             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Exposer l’API réseau du moteur de consentement                           */
/*  - Imposer sécurité, audit, cohérence                                       */
/*  - Centraliser les protections d’accès                                      */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*  - Aucun accès direct au controller sans garde                              */
/*  - Auth + Access toujours exécutés                                          */
/*  - Chaque route est intentionnelle                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { ConsentController } from "./consent.controller";

import { authMiddleware } from "../../auth/auth.middleware";
import { accessGuard } from "../../access/access.middleware";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                     */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* GLOBAL SECURITY LAYER                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Toute requête passe par :
 * 1. Résolution identité (auth)
 * 2. Journalisation access (access)
 */
router.use(authMiddleware);

/* -------------------------------------------------------------------------- */
/* CONSENT CHECK                                                              */
/* -------------------------------------------------------------------------- */
/**
 * Vérifier si un envoi est légalement autorisé.
 * Utilisé par NotificationService / IA / Gateway.
 *
 * POST /notification/consent/check
 */
router.post(
  "/check",
  accessGuard("notification", "VIEW"),
  ConsentController.check
);

/* -------------------------------------------------------------------------- */
/* CONSENT GRANT                                                              */
/* -------------------------------------------------------------------------- */
/**
 * Enregistrer un consentement explicite utilisateur.
 *
 * POST /notification/consent/grant
 */
router.post(
  "/grant",
  accessGuard("notification", "CREATE"),
  ConsentController.grant
);

/* -------------------------------------------------------------------------- */
/* CONSENT REVOKE                                                             */
/* -------------------------------------------------------------------------- */
/**
 * Révoquer un consentement.
 *
 * POST /notification/consent/revoke
 */
router.post(
  "/revoke",
  accessGuard("notification", "DELETE"),
  ConsentController.revoke
);

/* -------------------------------------------------------------------------- */
/* CONSENT LEDGER                                                             */
/* -------------------------------------------------------------------------- */
/**
 * Rejouer l’historique d’un consentement (audit).
 *
 * GET /notification/consent/ledger
 */
router.get(
  "/ledger",
  accessGuard("notification", "AUDIT"),
  ConsentController.ledger
);

/* -------------------------------------------------------------------------- */
/* LEGAL EXPORT                                                               */
/* -------------------------------------------------------------------------- */
/**
 * Exporter une preuve légale certifiable.
 *
 * GET /notification/consent/export/:consentId
 */
router.get(
  "/export/:consentId",
  accessGuard("notification", "AUDIT"),
  ConsentController.exportProof
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;
