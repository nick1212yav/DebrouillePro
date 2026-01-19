/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE ACCESS — PUBLIC API BARREL (WORLD #1 CANONICAL)                */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/access/index.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Exposer l’API PUBLIQUE officielle du moteur d’accès                     */
/*   - Encapsuler l’architecture interne                                      */
/*   - Garantir la stabilité contractuelle                                     */
/*                                                                            */
/*  RÈGLES ABSOLUES :                                                         */
/*   - Aucun import interne direct ailleurs dans le codebase                  */
/*   - Toute dépendance externe passe par ce fichier                          */
/*   - Toute breaking change est versionnée                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export { AccessEngine } from "./access.engine";

/* -------------------------------------------------------------------------- */
/* MIDDLEWARE                                                                 */
/* -------------------------------------------------------------------------- */

export { accessGuard } from "./access.middleware";

/* -------------------------------------------------------------------------- */
/* POLICY GOVERNANCE                                                         */
/* -------------------------------------------------------------------------- */

export {
  validatePolicy,
  normalizePolicy,
  bumpPolicyVersion,
  isPolicyActivable,
  buildPolicyKey,
} from "./access.policy";

/* -------------------------------------------------------------------------- */
/* TYPES & CONTRACTS                                                         */
/* -------------------------------------------------------------------------- */

export type {
  AccessRequest,
  AccessTarget,
  AccessSubject,
  AccessResult,
  AccessEvent,
  AccessPolicyRule,
  AccessCondition,
} from "./access.types";

export {
  AccessDecision,
  ACCESS_INVARIANTS,
} from "./access.types";

/* -------------------------------------------------------------------------- */
/* POLICY MODEL                                                              */
/* -------------------------------------------------------------------------- */

export {
  AccessPolicyModel,
  AccessPolicyStatus,
  AccessPolicyScope,
  type AccessPolicyDocument,
  type AccessPolicyAttributes,
} from "./accessPolicy.model";

/* -------------------------------------------------------------------------- */
/* VERSION TAG                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Version publique du moteur d’accès.
 * Toute évolution majeure incrémente cette valeur.
 */
export const ACCESS_ENGINE_VERSION = "1.0.0";

/* -------------------------------------------------------------------------- */
/* CONTRACT SNAPSHOT                                                         */
/* -------------------------------------------------------------------------- */
/**
 * Ce barrel est la SEULE surface publique du module ACCESS.
 *
 * Toute dépendance externe doit importer depuis :
 *
 *   @core/access
 *
 * JAMAIS depuis un fichier interne.
 *
 * Ceci garantit :
 *  ✅ Isolation
 *  ✅ Refactoring sans casse
 *  ✅ Évolutivité long terme
 */
