/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — TRANSACTION TYPES (OFFICIAL FINAL — LOCKED)               */
/*  File: backend/src/core/pay/transaction/transaction.types.ts               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Contrat universel de transaction                                        */
/*  - Langage commun : Pay • Wallet • Providers • IA • Audit                  */
/*  - Runtime-safe (enum utilisables comme valeurs)                           */
/*  - API-safe (DTO sérialisables)                                            */
/*  - Zéro ambiguïté TypeScript / Runtime                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* GLOBAL PRIMITIVES                                                          */
/* -------------------------------------------------------------------------- */

export type UUID = string;
export type ISODate = string;
export type CurrencyCode = string; // ISO-4217 + extensions locales

export interface Money {
  currency: CurrencyCode;
  amount: number;
}

/* -------------------------------------------------------------------------- */
/* TRANSACTION AXIS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Direction logique du flux.
 * ⚠️ Enum runtime (valeurs utilisées en DB, API, events).
 */
export enum TransactionDirection {
  IN = "IN",
  OUT = "OUT",
  INTERNAL = "INTERNAL",
  SYSTEM = "SYSTEM",
}

/**
 * Nature métier de la transaction.
 * ⚠️ Enum runtime strict.
 */
export enum TransactionNature {
  PAYMENT = "PAYMENT",
  PAYOUT = "PAYOUT",
  REFUND = "REFUND",

  ESCROW_LOCK = "ESCROW_LOCK",
  ESCROW_RELEASE = "ESCROW_RELEASE",
  ESCROW_REFUND = "ESCROW_REFUND",

  FEE = "FEE",
  TAX = "TAX",
  BONUS = "BONUS",
  ADJUSTMENT = "ADJUSTMENT",

  REVERSAL = "REVERSAL",
  SETTLEMENT = "SETTLEMENT",

  TOPUP = "TOPUP",
  WITHDRAW = "WITHDRAW",
  OFFLINE_SYNC = "OFFLINE_SYNC",
}

/**
 * Statut de cycle de vie.
 * ⚠️ Enum runtime (persisté).
 */
export enum TransactionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REVERSED = "REVERSED",
  EXPIRED = "EXPIRED",
}

/* -------------------------------------------------------------------------- */
/* PARTIES                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Acteur logique d'une transaction.
 * ⚠️ Aligné volontairement avec les services & providers.
 */
export enum TransactionActorType {
  PERSON = "PERSON",
  ORGANIZATION = "ORGANIZATION",
  SYSTEM = "SYSTEM",
  PROVIDER = "PROVIDER",
  GOVERNMENT = "GOVERNMENT",
}

/**
 * DTO sérialisable uniquement (jamais ObjectId).
 */
export interface TransactionPartyDTO {
  walletId?: UUID;

  /** Actor type normalisé */
  ownerType?: TransactionActorType;

  ownerId?: UUID;

  /** Affichage humain */
  label?: string;

  /** Mobile money */
  phone?: string;

  /** Banque */
  bankAccount?: string;

  /** Provider externe */
  provider?: string;
}

/* -------------------------------------------------------------------------- */
/* AMOUNTS                                                                    */
/* -------------------------------------------------------------------------- */

export interface TransactionAmountsDTO {
  currency: CurrencyCode;

  /** Montant brut */
  grossAmount: number;

  /** Frais */
  feeAmount?: number;

  /** Taxes */
  taxAmount?: number;

  /** Montant net réellement déplacé */
  netAmount: number;

  /** Conversion */
  exchangeRate?: number;
  originalCurrency?: CurrencyCode;
  originalAmount?: number;
}

/* -------------------------------------------------------------------------- */
/* LEDGER LEG                                                                 */
/* -------------------------------------------------------------------------- */

export interface TransactionLegDTO {
  legId: UUID;
  from?: TransactionPartyDTO;
  to?: TransactionPartyDTO;
  amounts: TransactionAmountsDTO;
}

/* -------------------------------------------------------------------------- */
/* REFERENCE                                                                  */
/* -------------------------------------------------------------------------- */

export interface TransactionReferenceDTO {
  module: string;
  entityId?: string;
  action?: string;
  correlationId?: UUID;
}

/* -------------------------------------------------------------------------- */
/* RISK & COMPLIANCE                                                          */
/* -------------------------------------------------------------------------- */

export interface TransactionRiskDTO {
  score?: number; // 0–100
  flags?: string[]; // AML, velocity, geo mismatch
  kycLevel?: "NONE" | "BASIC" | "FULL";
  sanctionsChecked?: boolean;
  fraudModelVersion?: string;
}

/* -------------------------------------------------------------------------- */
/* META                                                                       */
/* -------------------------------------------------------------------------- */

export interface TransactionMetaDTO {
  initiatedBy: "USER" | "SYSTEM" | "ADMIN" | "AI" | "PROVIDER";

  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;

  geo?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  trustScoreAtExecution?: number;
  offline?: boolean;
  tags?: string[];
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* IMMUTABLE VIEW (READ MODEL)                                                */
/* -------------------------------------------------------------------------- */

export interface TransactionViewDTO {
  id: UUID;
  reference: string;

  direction: TransactionDirection;
  nature: TransactionNature;
  status: TransactionStatus;

  legs: TransactionLegDTO[];
  referenceContext: TransactionReferenceDTO;

  risk?: TransactionRiskDTO;
  meta?: TransactionMetaDTO;

  /** ISO strings (API contract) */
  createdAt: ISODate;
  updatedAt?: ISODate;
  completedAt?: ISODate;
}

/* -------------------------------------------------------------------------- */
/* COMMANDS (WRITE MODEL)                                                     */
/* -------------------------------------------------------------------------- */

export interface CreateTransactionCommand {
  /** Idempotency key (optionnel, auto-généré sinon) */
  reference?: string;

  direction: TransactionDirection;
  nature: TransactionNature;

  legs: TransactionLegDTO[];

  referenceContext: TransactionReferenceDTO;

  meta?: TransactionMetaDTO;
  riskHint?: TransactionRiskDTO;
}

export interface UpdateTransactionStatusCommand {
  transactionId: UUID;
  status: TransactionStatus;
  reason?: string;
}

export interface ReverseTransactionCommand {
  originalTransactionId: UUID;
  reason: string;
  initiatedBy: "SYSTEM" | "ADMIN" | "AI";
}

/* -------------------------------------------------------------------------- */
/* EVENTS                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Types d’événements transactionnels (runtime-safe).
 */
export enum TransactionEventType {
  TRANSACTION_CREATED = "TRANSACTION_CREATED",
  TRANSACTION_PROCESSING = "TRANSACTION_PROCESSING",
  TRANSACTION_COMPLETED = "TRANSACTION_COMPLETED",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  TRANSACTION_REVERSED = "TRANSACTION_REVERSED",
  TRANSACTION_EXPIRED = "TRANSACTION_EXPIRED",
  TRANSACTION_SYNCED = "TRANSACTION_SYNCED",
}

export interface TransactionEventPayload {
  eventId: UUID;
  type: TransactionEventType;
  transaction: TransactionViewDTO;
  occurredAt: ISODate;
  source: "PAY_CORE" | "PROVIDER" | "SYNC_ENGINE" | "AI";
}

/* -------------------------------------------------------------------------- */
/* QUERIES                                                                    */
/* -------------------------------------------------------------------------- */

export interface TransactionQueryFilter {
  walletId?: UUID;
  ownerId?: UUID;
  module?: string;
  nature?: TransactionNature;
  status?: TransactionStatus;
  minAmount?: number;
  maxAmount?: number;
  currency?: CurrencyCode;
  fromDate?: ISODate;
  toDate?: ISODate;
  tags?: string[];
  riskScoreMin?: number;
}

export interface TransactionPagination {
  limit?: number;
  cursor?: string;
}

/* -------------------------------------------------------------------------- */
/* PROVIDER MAPPING                                                           */
/* -------------------------------------------------------------------------- */

export interface ProviderTransactionMapping {
  provider: string;
  providerTransactionId: string;
  rawPayload?: unknown;
  reconciledAt?: ISODate;
}

/* -------------------------------------------------------------------------- */
/* OFFLINE SYNCHRONIZATION                                                    */
/* -------------------------------------------------------------------------- */

export interface OfflineTransactionEnvelope {
  localId: UUID;
  deviceId: string;
  payload: CreateTransactionCommand;
  createdAt: ISODate;
  synced?: boolean;
}

/* -------------------------------------------------------------------------- */
/* ANALYTICS                                                                  */
/* -------------------------------------------------------------------------- */

export interface TransactionKPI {
  totalVolume: number;
  totalCount: number;
  successRate: number;
  avgAmount: number;
  topCurrencies: CurrencyCode[];
  riskDistribution: Record<string, number>;
}
