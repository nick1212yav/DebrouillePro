/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE ROUTES (OFFICIAL & FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/_template.routes.ts                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE                                                                       */
/*  - Déclarer TOUTES les routes HTTP du module                               */
/*  - AUCUNE logique métier                                                   */
/*  - AUCUNE logique d’accès                                                  */
/*  - Simple mapping URL → Controller                                        */
/*                                                                            */
/*  CE FICHIER EST LE STANDARD MONDIAL                                        */
/*  POUR TOUS LES MODULES DÉBROUILLE                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Router } from "express";

/* -------------------------------------------------------------------------- */
/* CONTROLLER                                                                */
/* -------------------------------------------------------------------------- */

import { TemplateController } from "./_template.controller";

/* -------------------------------------------------------------------------- */
/* ROUTER                                                                    */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/* ROUTES CRUD OFFICIELLES                                                    */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/_template
 * Créer une entité
 */
router.post(
  "/",
  TemplateController.create
);

/**
 * GET /api/_template/me
 * Lister les entités du propriétaire courant
 */
router.get(
  "/me",
  TemplateController.listMine
);

/**
 * GET /api/_template/:id
 * Lire une entité par ID
 */
router.get(
  "/:id",
  TemplateController.getById
);

/**
 * PUT /api/_template/:id
 * Mettre à jour une entité
 */
router.put(
  "/:id",
  TemplateController.update
);

/**
 * DELETE /api/_template/:id
 * Archiver une entité
 */
router.delete(
  "/:id",
  TemplateController.archive
);

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default router;
