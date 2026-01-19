/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE DOC — DOCUMENT ROUTES (WORLD #1 CANONICAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/doc/document.routes.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Définir le contrat HTTP public du module Document                      */
/*   - Orchestrer middlewares, sécurité, versioning                           */
/*   - Garantir lisibilité, stabilité, auditabilité                           */
/*                                                                            */
/*  INTERDICTIONS ABSOLUES :                                                   */
/*   - Aucune logique métier ici                                              */
/*   - Aucun accès direct aux modèles                                         */
/*   - Aucun effet de bord                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

import { DocumentController } from "./document.controller";

import { authMiddleware, requireAuth } from "../auth/auth.middleware";
import { accessGuard } from "../access/access.middleware";

import {
  ModuleName,
  ModuleAction,
} from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* ROUTER INITIALIZATION                                                      */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* GLOBAL MIDDLEWARES                                                         */
/* -------------------------------------------------------------------------- */
/**
 * Résolution d'identité (GUEST autorisé pour lecture publique).
 */
router.use(authMiddleware);

/* -------------------------------------------------------------------------- */
/* PUBLIC ROUTES                                                              */
/* -------------------------------------------------------------------------- */
/**
 * ⚠️ Routes accessibles sans authentification stricte.
 * Utiles pour documents publics / partagés.
 */

/**
 * GET /documents/:id
 * Lire un document public ou partagé.
 */
router.get(
  "/:id",
  accessGuard(ModuleName.DOCUMENT, ModuleAction.READ),
  DocumentController.getOne
);

/* -------------------------------------------------------------------------- */
/* PROTECTED ROUTES                                                           */
/* -------------------------------------------------------------------------- */
/**
 * Toutes les routes suivantes nécessitent une session valide.
 */
router.use(requireAuth);

/**
 * POST /documents
 * Créer un document.
 */
router.post(
  "/",
  accessGuard(ModuleName.DOCUMENT, ModuleAction.CREATE),
  DocumentController.create
);

/**
 * GET /documents
 * Lister les documents de l'identité courante.
 */
router.get(
  "/",
  accessGuard(ModuleName.DOCUMENT, ModuleAction.LIST),
  DocumentController.list
);

/**
 * POST /documents/:id/submit
 * Soumettre un document pour vérification.
 */
router.post(
  "/:id/submit",
  accessGuard(ModuleName.DOCUMENT, ModuleAction.SUBMIT),
  DocumentController.submit
);

/**
 * POST /documents/:id/verify
 * Vérifier un document (admin / institution).
 */
router.post(
  "/:id/verify",
  accessGuard(ModuleName.DOCUMENT, ModuleAction.VERIFY),
  DocumentController.verify
);

/**
 * POST /documents/:id/reject
 * Rejeter un document.
 */
router.post(
  "/:id/reject",
  accessGuard(ModuleName.DOCUMENT, ModuleAction.REJECT),
  DocumentController.reject
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Versionnable facilement (/api/v1/documents)
 * ✔️ Sécurité centralisée (auth + access)
 * ✔️ Compatible multi-clients (web / mobile / partenaires)
 * ✔️ Audit-ready
 * ✔️ IA-ready (recommandations, scoring)
 *
 * 👉 Ce router peut supporter des millions de requêtes / jour.
 */
