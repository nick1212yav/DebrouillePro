/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — TRANSACTION MODULE REGISTRY (OFFICIAL FINAL — LOCKED)     */
/*  File: backend/src/core/pay/transaction/index.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Point d’entrée unique du moteur Transaction                             */
/*  - Surface publique stable pour tout le backend                            */
/*  - Registre officiel des types, services, contrats                          */
/*                                                                            */
/*  PRINCIPES :                                                               */
/*  - Aucun import direct vers les sous-fichiers internes                      */
/*  - Versionnable                                                           */
/*  - Tree-shake friendly                                                     */
/*  - Compatible microservices / workers                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* RUNTIME ENUM IMPORTS (LOCAL USAGE)                                          */
/* -------------------------------------------------------------------------- */

import {
  TransactionNature,
  TransactionStatus,
} from "./transaction.types";

/* -------------------------------------------------------------------------- */
/* VERSION                                                                    */
/* -------------------------------------------------------------------------- */

export const TRANSACTION_CORE_VERSION = "1.0.0";

/* -------------------------------------------------------------------------- */
/* SERVICE                                                                    */
/* -------------------------------------------------------------------------- */

export { TransactionService } from "./transaction.service";

/* -------------------------------------------------------------------------- */
/* MODELS                                                                     */
/* -------------------------------------------------------------------------- */

export {
  TransactionModel,
  type TransactionDocument,
} from "./transaction.model";

/* -------------------------------------------------------------------------- */
/* TYPES (PUBLIC CONTRACT)                                                    */
/* -------------------------------------------------------------------------- */

export {
  /* Commands & DTOs */
  type CreateTransactionCommand,
  type TransactionViewDTO,
  type TransactionLegDTO,
  type TransactionEventPayload,
  type TransactionReferenceDTO,

  /* Enums (runtime-safe) */
  TransactionDirection,
  TransactionNature,
  TransactionStatus,
  TransactionEventType,
} from "./transaction.types";

/* -------------------------------------------------------------------------- */
/* SAFE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Vérifier si une transaction est définitivement finalisée.
 */
export const isFinalTransaction = (
  status: TransactionStatus
): boolean =>
  status === TransactionStatus.COMPLETED ||
  status === TransactionStatus.REVERSED ||
  status === TransactionStatus.CANCELLED ||
  status === TransactionStatus.EXPIRED;

/**
 * Vérifier si une transaction est encore mutable.
 */
export const isMutableTransaction = (
  status: TransactionStatus
): boolean =>
  status === TransactionStatus.PENDING ||
  status === TransactionStatus.PROCESSING;

/**
 * Déterminer si une transaction a un impact financier réel.
 */
export const hasFinancialImpact = (
  nature: TransactionNature
): boolean =>
  ![
    TransactionNature.FEE,
    TransactionNature.ADJUSTMENT,
  ].includes(nature);

/**
 * Générer une référence humaine (client-safe, non sensible).
 */
export const generateHumanReference = (
  prefix: string = "TX"
): string =>
  `${prefix}-${Date.now()
    .toString(36)
    .toUpperCase()}`;

/* -------------------------------------------------------------------------- */
/* REGISTRY METADATA                                                          */
/* -------------------------------------------------------------------------- */

export const TRANSACTION_CORE_METADATA = {
  name: "debrouille-pay-transaction-core",
  description:
    "Universal distributed ledger engine for Debrouille Pay",
  version: TRANSACTION_CORE_VERSION,

  guarantees: [
    "atomicity",
    "idempotency",
    "auditability",
    "double-spend protection",
    "event-driven",
    "multi-wallet",
    "multi-leg",
    "escrow compatible",
    "offline resilient",
    "provider-agnostic",
    "future-proof",
  ],
} as const;

/* -------------------------------------------------------------------------- */
/* FUTURE EXTENSION HOOK                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Hook d’extension pour plugins futurs :
 * - Risk engines
 * - Fraud engines
 * - Reconciliation workers
 * - Ledger snapshots
 * - Compliance automation
 */
export type TransactionExtensionHook = (
  context: {
    transactionId: string;
    stage:
      | "PRE_COMMIT"
      | "POST_COMMIT"
      | "ROLLBACK";
  }
) => Promise<void>;

/* -------------------------------------------------------------------------- */
/* DEFAULT EXPORT (OPTIONAL)                                                  */
/* -------------------------------------------------------------------------- */

export default {
  version: TRANSACTION_CORE_VERSION,
  service: () => import("./transaction.service"),
};
