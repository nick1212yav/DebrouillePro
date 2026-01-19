/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — TYPES (ULTRA OFFICIAL FINAL)                              */
/*  File: backend/src/core/pay/pay.types.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  CONSTITUTION DU MODULE PAY                                                 */
/*  - Contrat universel et stable                                              */
/*  - Partagé entre Wallet, Transaction, Escrow, Providers, IA, Hooks         */
/*  - Compatible Afrique, Offline, Mobile Money, Crypto, Banque              */
/*  - Aucun code métier ici                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* ========================================================================== */
/* GLOBAL PRIMITIVES                                                          */
/* ========================================================================== */

export type UUID = string;
export type ISODateString = string;
export type CountryCode = string;     // ISO-3166
export type CurrencyCode =
  | "USD"
  | "EUR"
  | "CDF"
  | "XAF"
  | "XOF"
  | "KES"
  | "NGN"
  | "ZAR"
  | "GHS"
  | "UGX"
  | string; // extensible

export type OwnerType = "PERSON" | "ORGANIZATION";

/* ========================================================================== */
/* PAYMENT NETWORKS / OPERATORS (AFRICA + WORLD)                               */
/* ========================================================================== */

export type MobileMoneyOperator =
  | "ORANGE_MONEY"
  | "AIRTEL_MONEY"
  | "VODACOM_MPESA"
  | "MTN_MOMO"
  | "MOOV_MONEY"
  | "FREE_MONEY"
  | "WAVE"
  | "TIGO_PESA"
  | "SAFARICOM_MPESA"
  | "ETHIO_TELECOM"
  | "GLO_MONEY"
  | "9MOBILE"
  | "TELMA_MVOLA"
  | "ZAMTEL"
  | "UNKNOWN";

export type BankNetwork =
  | "SWIFT"
  | "SEPA"
  | "ACH"
  | "RTGS"
  | "LOCAL_CLEARING"
  | "MOBILE_BANKING";

export type CryptoNetwork =
  | "BITCOIN"
  | "ETHEREUM"
  | "TRON"
  | "POLYGON"
  | "BINANCE_SMART_CHAIN"
  | "STELLAR"
  | "LIGHTNING"
  | "OTHER";

/* ========================================================================== */
/* WALLET TYPES                                                               */
/* ========================================================================== */

export type WalletStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "FROZEN"
  | "CLOSED";

export interface WalletBalanceSnapshot {
  currency: CurrencyCode;
  available: number;
  locked: number;
  pending: number;
  updatedAt: ISODateString;
}

export interface WalletSnapshot {
  walletId: UUID;
  ownerType: OwnerType;
  ownerId: UUID;
  status: WalletStatus;
  balances: WalletBalanceSnapshot[];
  country?: CountryCode;
}

/* ========================================================================== */
/* TRANSACTION TYPES                                                          */
/* ========================================================================== */

export type TransactionDirection = "IN" | "OUT" | "INTERNAL";

export type TransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REVERSED";

export type TransactionNature =
  | "PAYMENT"
  | "PAYOUT"
  | "REFUND"
  | "ESCROW_LOCK"
  | "ESCROW_RELEASE"
  | "FEE"
  | "ADJUSTMENT"
  | "TOPUP"
  | "WITHDRAW";

export interface TransactionPartySnapshot {
  walletId: UUID;
  ownerType: OwnerType;
  ownerId: UUID;
}

export interface TransactionAmountsSnapshot {
  currency: CurrencyCode;
  amount: number;
  fee?: number;
  netAmount: number;
}

export interface TransactionSnapshot {
  transactionId: UUID;
  reference: string;
  direction: TransactionDirection;
  nature: TransactionNature;
  status: TransactionStatus;
  from?: TransactionPartySnapshot;
  to?: TransactionPartySnapshot;
  amounts: TransactionAmountsSnapshot;
  module?: string;
  entityId?: string;
  createdAt: ISODateString;
  completedAt?: ISODateString;
}

/* ========================================================================== */
/* ESCROW TYPES                                                               */
/* ========================================================================== */

export type EscrowStatus =
  | "LOCKED"
  | "RELEASED"
  | "REFUNDED"
  | "DISPUTED"
  | "EXPIRED"
  | "CANCELLED";

export type EscrowReleaseTrigger =
  | "MANUAL"
  | "AUTO_TIME"
  | "MODULE_EVENT"
  | "DISPUTE_RESOLUTION"
  | "AI_DECISION";

export interface EscrowSnapshot {
  escrowId: UUID;
  status: EscrowStatus;
  amount: number;
  currency: CurrencyCode;
  fromWalletId: UUID;
  toWalletId: UUID;
  releaseTrigger?: EscrowReleaseTrigger;
  createdAt?: ISODateString;
  releasedAt?: ISODateString;
}

/* ========================================================================== */
/* PAYOUT TYPES                                                               */
/* ========================================================================== */

export type PayoutStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PayoutMethod =
  | "BANK_TRANSFER"
  | "MOBILE_MONEY"
  | "CRYPTO"
  | "CASH"
  | "AGENT"
  | "OTHER";

export interface MobileMoneyDestination {
  method: "MOBILE_MONEY";
  operator: MobileMoneyOperator;
  phoneNumber: string;
  country: CountryCode;
}

export interface BankDestination {
  method: "BANK_TRANSFER";
  bankName: string;
  accountName?: string;
  accountNumber: string;
  network?: BankNetwork;
  country: CountryCode;
}

export interface CryptoDestination {
  method: "CRYPTO";
  network: CryptoNetwork;
  address: string;
  memo?: string;
}

export interface CashDestination {
  method: "CASH" | "AGENT";
  country: CountryCode;
  pickupPoint?: string;
}

export type PayoutDestination =
  | MobileMoneyDestination
  | BankDestination
  | CryptoDestination
  | CashDestination;

export interface PayoutSnapshot {
  payoutId: UUID;
  walletId: UUID;
  amount: number;
  currency: CurrencyCode;
  status: PayoutStatus;
  method: PayoutMethod;
  destination: PayoutDestination;
  requestedAt: ISODateString;
  completedAt?: ISODateString;
}

/* ========================================================================== */
/* INVOICE TYPES                                                              */
/* ========================================================================== */

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "CANCELLED"
  | "OVERDUE";

export interface InvoiceLineItem {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceSnapshot {
  invoiceId: UUID;
  reference: string;
  amount: number;
  currency: CurrencyCode;
  status: InvoiceStatus;
  items?: InvoiceLineItem[];
  issuedAt?: ISODateString;
  paidAt?: ISODateString;
}

/* ========================================================================== */
/* PAY ACTION CONTEXT (RULES / ACCESS / IA)                                    */
/* ========================================================================== */

export type PayAction =
  | "WALLET_CREATE"
  | "TOPUP"
  | "PAYMENT"
  | "ESCROW_LOCK"
  | "ESCROW_RELEASE"
  | "PAYOUT_REQUEST"
  | "WITHDRAW"
  | "INVOICE_ISSUE"
  | "REFUND";

export interface PayActionContext {
  action: PayAction;
  ownerType: OwnerType;
  ownerId: UUID;
  walletId?: UUID;
  amount?: number;
  currency?: CurrencyCode;
  trustScore?: number;
  verificationLevel?: number;
  country?: CountryCode;
  operator?: MobileMoneyOperator;
  module?: string;
  entityId?: string;
  flags?: string[]; // risk / fraud / geo / velocity
}

/* ========================================================================== */
/* PAY DECISION                                                               */
/* ========================================================================== */

export type PayDecision =
  | "ALLOW"
  | "LIMIT"
  | "DENY"
  | "REVIEW";

export interface PayDecisionLimits {
  maxAmount?: number;
  requiresManualReview?: boolean;
  cooldownSeconds?: number;
}

export interface PayDecisionResult {
  decision: PayDecision;
  reason: string;
  confidence?: number; // IA scoring
  limitsApplied?: PayDecisionLimits;
}

/* ========================================================================== */
/* PROVIDER ABSTRACTION TYPES                                                 */
/* ========================================================================== */

export type ProviderKind =
  | "MOBILE_MONEY"
  | "BANK"
  | "CRYPTO"
  | "SANDBOX"
  | "OFFLINE";

export interface ProviderCapabilities {
  supportsRefund: boolean;
  supportsPartial: boolean;
  supportsWebhook: boolean;
  supportsOfflineSync: boolean;
  maxAmount?: number;
  supportedCurrencies?: CurrencyCode[];
  supportedOperators?: MobileMoneyOperator[];
}

export interface ProviderContext {
  providerName: string;
  providerKind: ProviderKind;
  country?: CountryCode;
  operator?: MobileMoneyOperator;
}

/* ========================================================================== */
/* EVENTS SNAPSHOTS (HOOKS SAFE CONTRACT)                                      */
/* ========================================================================== */

export interface WalletEventSnapshot {
  wallet: WalletSnapshot;
  at: ISODateString;
}

export interface TransactionEventSnapshot {
  transaction: TransactionSnapshot;
  at: ISODateString;
}

export interface EscrowEventSnapshot {
  escrow: EscrowSnapshot;
  at: ISODateString;
}

export interface PayoutEventSnapshot {
  payout: PayoutSnapshot;
  at: ISODateString;
}

export interface InvoiceEventSnapshot {
  invoice: InvoiceSnapshot;
  at: ISODateString;
}
