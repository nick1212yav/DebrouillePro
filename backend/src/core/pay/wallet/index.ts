/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — WALLET MODULE PUBLIC KERNEL                               */
/*  File: backend/src/core/pay/wallet/index.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Point d’entrée officiel du sous-système Wallet                          */
/*  - Expose uniquement les contrats stables                                  */
/*  - Cache les implémentations internes                                      */
/*  - Garantit compatibilité long terme                                       */
/*                                                                            */
/*  PHILOSOPHIE :                                                             */
/*  - Clean Architecture                                                     */
/*  - Dependency Inversion                                                    */
/*  - Zero Leaks                                                              */
/*  - World-scale ready                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* PUBLIC TYPES                                                               */
/* -------------------------------------------------------------------------- */

export * from "./wallet.types";

/* -------------------------------------------------------------------------- */
/* DOMAIN MODELS                                                              */
/* -------------------------------------------------------------------------- */

export { WalletModel } from "./wallet.model";

/* -------------------------------------------------------------------------- */
/* CORE ENGINE                                                                */
/* -------------------------------------------------------------------------- */

export { WalletService } from "./wallet.service";

/* -------------------------------------------------------------------------- */
/* DOMAIN CONSTANTS (OPTIONAL EXTENSION POINT)                                */
/* -------------------------------------------------------------------------- */

export const WALLET_ENGINE_VERSION = "1.0.0";
export const WALLET_ENGINE_NAME = "Débrouille Distributed Wallet Engine";

/* -------------------------------------------------------------------------- */
/* SAFE FUTURE EXTENSIONS                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Ces exports sont volontairement limités.
 * Toute extension future doit respecter :
 *
 * - Compatibilité ascendante
 * - Auditabilité
 * - Sécurité financière
 * - Non-régression
 *
 * Aucune dépendance métier ne doit importer :
 *   - mongoose directement
 *   - wallet.model.ts directement
 * sauf via ce kernel.
 */

/* -------------------------------------------------------------------------- */
/* INTERNAL NOTES (DOCUMENTATION EMBEDDED)                                    */
/* -------------------------------------------------------------------------- */

/**
 * WALLET CAPABILITIES
 *
 * - Multi-currency ledger
 * - Atomic transactions
 * - Escrow integration
 * - Trust aware
 * - Offline tolerant
 * - Provider agnostic
 * - Africa-ready (Mobile Money, USSD, low-connectivity)
 * - Global-ready (Stripe, SEPA, SWIFT, Crypto bridges)
 *
 * TARGET MODULES
 *
 * - PAY
 * - ESCROW
 * - TRANSACTION
 * - PROVIDERS
 * - AI ENGINE
 * - FRAUD ENGINE
 * - COMPLIANCE ENGINE
 */

/* -------------------------------------------------------------------------- */
/* BOOTSTRAP HOOK (OPTIONAL)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Permet d’initialiser des hooks globaux si nécessaire
 * (metrics, tracing, circuit-breakers, warmup).
 *
 * À appeler au démarrage du backend si activé.
 */
export async function bootstrapWalletEngine() {
  // Placeholder volontaire pour extensions futures
  return true;
}
