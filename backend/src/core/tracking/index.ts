/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRACKING — MODULE BOOTSTRAP (ULTRA FINAL)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/tracking/index.ts                                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Point d’entrée unique du module Tracking                               */
/*   - Centraliser les exports                                                */
/*   - Valider l’intégrité au démarrage                                       */
/*   - Préparer l’injection dans Gateway                                      */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Aucun side-effect non contrôlé                                         */
/*   - Chargement déterministe                                                */
/*   - Auto-documentation                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import trackingRoutes from "./tracking.routes";
import { TrackingService } from "./tracking.service";
import {
  AuditLogModel,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
} from "./auditLog.model";

/* -------------------------------------------------------------------------- */
/* MODULE METADATA                                                            */
/* -------------------------------------------------------------------------- */

export const TRACKING_MODULE = {
  name: "tracking",
  version: "1.0.0",
  description:
    "Global audit, observability and forensic tracking engine",
  critical: true,
  owner: "core-platform",
} as const;

/* -------------------------------------------------------------------------- */
/* INTEGRITY CHECKS (BOOT SAFETY)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Vérifie que les dépendances critiques sont bien chargées.
 * En cas d’échec → crash volontaire (fail-fast).
 */
const assertIntegrity = (): void => {
  if (!TrackingService) {
    throw new Error(
      "[TRACKING] TrackingService not loaded"
    );
  }

  if (!AuditLogModel) {
    throw new Error(
      "[TRACKING] AuditLogModel not loaded"
    );
  }

  if (!trackingRoutes) {
    throw new Error(
      "[TRACKING] trackingRoutes not loaded"
    );
  }
};

/* -------------------------------------------------------------------------- */
/* BOOTSTRAP                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Initialisation du module Tracking.
 * Appelé une seule fois au démarrage serveur.
 */
export const initTrackingModule = (): void => {
  assertIntegrity();

  // Logging minimal volontaire (pas de bruit)
  console.info(
    `🛰️  [TRACKING] Module initialized v${TRACKING_MODULE.version}`
  );
};

/* -------------------------------------------------------------------------- */
/* PUBLIC EXPORTS                                                             */
/* -------------------------------------------------------------------------- */

export {
  trackingRoutes,
  TrackingService,
  AuditLogModel,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
};
