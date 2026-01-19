/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — PAYOUT MODULE ENTRYPOINT (OFFICIAL & FINAL)               */
/*  File: backend/src/core/pay/payout/index.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE                                                                       */
/*  - Point d’entrée unique du module payout                                   */
/*  - Exposer API publique stable                                              */
/*  - Garantir encapsulation & sécurité                                        */
/*  - Préparer injection, tests, monitoring                                    */
/*                                                                            */
/*  PRINCIPES                                                                  */
/*  - Aucun import direct hors index                                           */
/*  - Contrats typés exportés                                                  */
/*  - Zéro couplage transverse                                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* MODELS                                                                     */
/* -------------------------------------------------------------------------- */

export {
  PayoutModel,
  type PayoutDocument,
  type PayoutStatus,
  type PayoutMethod,
} from "./payout.model";

/* -------------------------------------------------------------------------- */
/* SERVICES                                                                   */
/* -------------------------------------------------------------------------- */

export { PayoutService } from "./payout.service";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type {
  CreatePayoutInput,
  ExecutePayoutResult,
} from "./payout.service";

/* -------------------------------------------------------------------------- */
/* FUTURE EXTENSIONS                                                          */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ ZONE RÉSERVÉE POUR EXTENSIONS FUTURES :
 *
 * - Provider adapters (bank, mobile money, crypto)
 * - Risk engines
 * - Webhooks
 * - SLA monitoring
 * - Smart routing
 * - Retry orchestration
 *
 * Objectif : zéro breaking change public.
 */
