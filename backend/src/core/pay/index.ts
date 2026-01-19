/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — PUBLIC MODULE GATEWAY (SOVEREIGN INDEX)                   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/index.ts                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  DÉFINITION                                                                */
/*  Ce fichier est la PORTE UNIQUE d’accès au moteur financier Débrouille.     */
/*                                                                            */
/*  Aucun autre module ne doit importer un fichier interne directement.       */
/*                                                                            */
/*  Toute intégration (API, Workers, IA, Microservices, Mobile, Webhooks)      */
/*  passe EXCLUSIVEMENT par cet index.                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* WALLET — CŒUR DE VALEUR                                                     */
/* -------------------------------------------------------------------------- */

export {
  WalletModel,
} from "./wallet/wallet.model";

export {
  WalletService,
} from "./wallet/wallet.service";

export type {
  WalletOwnerType,
  WalletStatus,
  CurrencyCode,
  WalletBalance,
  WalletLimits,
  WalletSecurity,
  WalletMeta,
  WalletDocument,
} from "./wallet/wallet.types";

/* -------------------------------------------------------------------------- */
/* TRANSACTION — VÉRITÉ HISTORIQUE                                             */
/* -------------------------------------------------------------------------- */

export {
  TransactionModel,
} from "./transaction/transaction.model";

export {
  TransactionService,
} from "./transaction/transaction.service";

export type {
  TransactionDirection,
  TransactionStatus,
  TransactionNature,
  TransactionReference,
  TransactionPart,
  TransactionAmounts,
  TransactionMeta,
  TransactionDocument,
} from "./transaction/transaction.types";

/* -------------------------------------------------------------------------- */
/* ESCROW — CONFIANCE CONTRACTUELLE                                            */
/* -------------------------------------------------------------------------- */

export {
  EscrowModel,
} from "./escrow/escrow.model";

export {
  EscrowService,
} from "./escrow/escrow.service";

export type {
  EscrowStatus,
  EscrowReleaseTrigger,
  EscrowPart,
  EscrowRules,
  EscrowMeta,
  EscrowDocument,
} from "./escrow/escrow.types";

/* -------------------------------------------------------------------------- */
/* PAYOUT — SORTIE D’ARGENT SÉCURISÉE                                          */
/* -------------------------------------------------------------------------- */

export {
  PayoutModel,
} from "./payout/payout.model";

export {
  PayoutService,
} from "./payout/payout.service";

export type {
  PayoutStatus,
  PayoutMethod,
  PayoutDestination,
  PayoutMeta,
  PayoutDocument,
} from "./payout/payout.types";

/* -------------------------------------------------------------------------- */
/* INVOICE — VÉRITÉ LÉGALE                                                     */
/* -------------------------------------------------------------------------- */

export {
  InvoiceModel,
} from "./invoice/invoice.model";

export {
  InvoiceAnalyticsService,
} from "./invoice/invoice.analytics";

export type {
  InvoiceStatus,
  InvoiceParty,
  InvoiceItem,
  InvoiceMeta,
  InvoiceDocument,
} from "./invoice/invoice.types";

/* -------------------------------------------------------------------------- */
/* RULES ENGINE — GOUVERNANCE FINANCIÈRE                                       */
/* -------------------------------------------------------------------------- */

export {
  PayRulesEngine,
} from "./pay.rules";

export type {
  PayDecision,
  PayContext,
  PayRuleResult,
} from "./pay.rules";

/* -------------------------------------------------------------------------- */
/* EVENTS — OBSERVABILITÉ & RÉACTION                                           */
/* -------------------------------------------------------------------------- */

export {
  payEventBus,
  PayEvents,
} from "./pay.events";

/* -------------------------------------------------------------------------- */
/* HOOKS — AUTOMATION SYSTÈME                                                  */
/* -------------------------------------------------------------------------- */

export {
  initializePayHooks,
} from "./pay.hooks";

/* -------------------------------------------------------------------------- */
/* PROVIDERS — PASSERELLE MONDIALE                                             */
/* -------------------------------------------------------------------------- */

export {
  ProviderFactory,
} from "./providers/provider.factory";

export type {
  ProviderName,
  ProviderEnvironment,
  PaymentMethod,
  ProviderSelectionContext,
  ProviderSelectionResult,
  NormalizedWebhookEvent,
  ProviderError,
  ProviderHealthStatus,
} from "./providers/provider.types";

export type {
  PaymentProvider,
  ProviderCapabilities,
  ProviderPaymentRequest,
  ProviderPaymentResponse,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderWebhookPayload,
} from "./providers/provider.interface";

/* -------------------------------------------------------------------------- */
/* WEBHOOKS — ENTRÉE EXTERNE SÉCURISÉE                                         */
/* -------------------------------------------------------------------------- */

export {
  WebhookHandler,
  WebhookValidator,
  WebhookMapper,
} from "./providers/webhooks";

/* -------------------------------------------------------------------------- */
/* PAY SERVICE — ORCHESTRATEUR GLOBAL                                         */
/* -------------------------------------------------------------------------- */

export {
  PayService,
} from "./pay.service";

/* -------------------------------------------------------------------------- */
/* IMMUTABILITÉ CONTRACTUELLE                                                 */
/* -------------------------------------------------------------------------- */
/**
 * ⚠️ RÈGLES ABSOLUES
 *
 * - Toute importation hors de ce fichier est une violation d’architecture.
 * - Ce fichier est versionné comme un contrat public.
 * - Toute modification nécessite :
 *      ✔ audit technique
 *      ✔ migration
 *      ✔ validation sécurité
 *      ✔ validation compatibilité
 *
 * Ce fichier est la Constitution du moteur financier Débrouille.
 */
Object.freeze(module.exports);
