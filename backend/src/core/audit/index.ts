/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AUDIT PUBLIC API (WORLD #1 FINAL)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/audit/index.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer l’API publique officielle du moteur d’audit                     */
/*   - Garantir stabilité contractuelle                                       */
/*   - Masquer l’implémentation interne                                        */
/*                                                                            */
/*  EXEMPLE :                                                                  */
/*   import {                                                                 */
/*     AuditService,                                                          */
/*     type AuditEvent,                                                       */
/*     type AuditQuery,                                                       */
/*   } from "@/core/audit";                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type {
  AuditDomain,
  AuditSeverity,
  AuditActor,
  AuditTarget,
  AuditContext,
  AuditEvent,
  AuditQuery,
  AuditMetrics,
} from "./audit.types";

export {
  nowISO,
  defaultSeverityForDomain,
} from "./audit.types";

/* -------------------------------------------------------------------------- */
/* MODELS                                                                     */
/* -------------------------------------------------------------------------- */

export {
  AuditLogModel,
} from "./auditLog.model";

export type {
  AuditLogDocument,
} from "./auditLog.model";

/* -------------------------------------------------------------------------- */
/* SERVICES                                                                   */
/* -------------------------------------------------------------------------- */

export {
  AuditService,
} from "./audit.service";

/* -------------------------------------------------------------------------- */
/* CONVENTION                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * ✅ Toute interaction avec l’audit doit passer par ce module.
 * ❌ Aucun import direct depuis les fichiers internes.
 *
 * Bénéfices :
 *  - Gouvernance claire
 *  - Compatibilité long terme
 *  - Refactorisation sans risque
 *  - Scalabilité mondiale
 */
