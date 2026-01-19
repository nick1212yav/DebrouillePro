/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — WEBHOOKS MODULE PUBLIC INDEX (SOVEREIGN GATEWAY)          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/providers/webhooks/index.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION                                                                   */
/*  - Exposer UNIQUEMENT les contrats publics du module Webhooks              */
/*  - Empêcher toute dépendance interne non contrôlée                         */
/*  - Centraliser la surface d’intégration                                    */
/*                                                                            */
/*  CE FICHIER EST UN CONTRAT D’ARCHITECTURE                                   */
/*  Toute modification est une décision de gouvernance système                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* PUBLIC API — HANDLER                                                       */
/* -------------------------------------------------------------------------- */

export { WebhookHandler } from "./webhook.handler";

/* -------------------------------------------------------------------------- */
/* PUBLIC API — SECURITY                                                      */
/* -------------------------------------------------------------------------- */

export {
  WebhookValidator,
  type WebhookValidationContext,
  type WebhookValidationResult,
} from "./webhook.validator";

/* -------------------------------------------------------------------------- */
/* PUBLIC API — NORMALIZATION                                                 */
/* -------------------------------------------------------------------------- */

export {
  WebhookMapper,
} from "./webhook.mapper";

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY GUARD                                                         */
/* -------------------------------------------------------------------------- */
/**
 * ⚠️ RÈGLES ABSOLUES
 *
 * - Aucun autre fichier du projet ne doit importer directement :
 *      • webhook.validator.ts
 *      • webhook.mapper.ts
 *      • webhook.handler.ts
 *
 * - Toute intégration externe DOIT passer par cet index.
 *
 * - Ceci garantit :
 *      ✔ stabilité des imports
 *      ✔ compatibilité long terme
 *      ✔ refactoring sans casse
 *      ✔ gouvernance claire
 *
 * Toute violation doit être considérée comme un défaut d’architecture.
 */
Object.freeze(module.exports);
