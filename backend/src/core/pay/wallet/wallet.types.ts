/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — WALLET TYPES (UNIVERSAL FINANCIAL CONTRACT)               */
/*  File: backend/src/core/pay/wallet/wallet.types.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  SINGLE SOURCE OF TRUTH                                                    */
/*  - Aligné STRICTEMENT avec wallet.model.ts                                 */
/*  - Toute devise doit être validée juridiquement avant ajout                */
/*  - ZÉRO divergence entre runtime et types                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* CURRENCIES (OFFICIAL BANKING SET)                                           */
/* -------------------------------------------------------------------------- */
/**
 * ⚠️ DOIT RESTER STRICTEMENT ALIGNÉ AVEC :
 * backend/src/core/pay/wallet/wallet.model.ts
 */
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
  | "RWF"
  | "TZS"
  | "MAD"
  | "EGP";

/* -------------------------------------------------------------------------- */
/* PAYMENT RAILS                                                              */
/* -------------------------------------------------------------------------- */

export enum PaymentRail {
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
  CARD = "CARD",
  CRYPTO = "CRYPTO",
  CASH = "CASH",
  OFFLINE_MESH = "OFFLINE_MESH",
}

/* -------------------------------------------------------------------------- */
/* MOBILE MONEY OPERATORS                                                     */
/* -------------------------------------------------------------------------- */

export enum MobileMoneyOperator {
  ORANGE_MONEY = "ORANGE_MONEY",
  AIRTEL_MONEY = "AIRTEL_MONEY",
  VODACOM_MPESA = "VODACOM_MPESA",
  MTN_MOMO = "MTN_MOMO",
  MOOV_MONEY = "MOOV_MONEY",
  WAVE = "WAVE",
  FREE_MONEY = "FREE_MONEY",
  TIGO_PESA = "TIGO_PESA",
  SAFARICOM_MPESA = "SAFARICOM_MPESA",
  TELECEL_MONEY = "TELECEL_MONEY",
  GLO_MONEY = "GLO_MONEY",
}

/* -------------------------------------------------------------------------- */
/* BANK NETWORKS                                                              */
/* -------------------------------------------------------------------------- */

export enum BankNetwork {
  SWIFT = "SWIFT",
  SEPA = "SEPA",
  ACH = "ACH",
  RTGS = "RTGS",
  BEAC = "BEAC",
  BCEAO = "BCEAO",
  VISA = "VISA",
  MASTERCARD = "MASTERCARD",
  UNIONPAY = "UNIONPAY",
}

/* -------------------------------------------------------------------------- */
/* WALLET OWNERSHIP                                                           */
/* -------------------------------------------------------------------------- */

export type WalletOwnerType =
  | "PERSON"
  | "ORGANIZATION"
  | "MERCHANT"
  | "INSTITUTION"
  | "GOVERNMENT";

/* -------------------------------------------------------------------------- */
/* WALLET STATUS                                                              */
/* -------------------------------------------------------------------------- */

export enum WalletStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  FROZEN = "FROZEN",
  CLOSED = "CLOSED",
  UNDER_REVIEW = "UNDER_REVIEW",
}

/* -------------------------------------------------------------------------- */
/* WALLET RISK & COMPLIANCE                                                   */
/* -------------------------------------------------------------------------- */

export enum WalletRiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum ComplianceLevel {
  NONE = "NONE",
  BASIC_KYC = "BASIC_KYC",
  FULL_KYC = "FULL_KYC",
  AML_VERIFIED = "AML_VERIFIED",
  GOVERNMENT_VERIFIED = "GOVERNMENT_VERIFIED",
}

/* -------------------------------------------------------------------------- */
/* BALANCE STRUCTURES                                                         */
/* -------------------------------------------------------------------------- */

export interface WalletBalance {
  currency: CurrencyCode;
  available: number;
  locked: number;
  pending: number;
  checksum?: string;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* LIMITS & GOVERNANCE                                                        */
/* -------------------------------------------------------------------------- */

export interface WalletLimits {
  dailyIn?: number;
  dailyOut?: number;
  monthlyIn?: number;
  monthlyOut?: number;
  maxBalance?: number;
  maxSingleTransaction?: number;
  geoRestrictedCountries?: string[];
  allowedRails?: PaymentRail[];
}

/* -------------------------------------------------------------------------- */
/* SECURITY & INCIDENTS                                                       */
/* -------------------------------------------------------------------------- */

export interface WalletSecurity {
  frozenReason?: string;
  frozenAt?: Date;
  frozenBy?: "SYSTEM" | "ADMIN" | "AI";
  lastFraudCheckAt?: Date;
  fraudScore?: number;
  incidentIds?: string[];
}

/* -------------------------------------------------------------------------- */
/* WALLET META                                                                */
/* -------------------------------------------------------------------------- */

export interface WalletMeta {
  trustScoreAtCreation: number;
  verificationLevelAtCreation: number;
  complianceLevel?: ComplianceLevel;
  createdFrom: "SYSTEM" | "MIGRATION" | "IMPORT" | "PARTNER";
  primaryRail?: PaymentRail;
  preferredOperator?: MobileMoneyOperator;
  tags?: string[];
}

/* -------------------------------------------------------------------------- */
/* EXTERNAL ACCOUNTS                                                          */
/* -------------------------------------------------------------------------- */

export interface MobileMoneyAccount {
  operator: MobileMoneyOperator;
  phoneNumber: string;
  country: string;
  verified?: boolean;
}

export interface BankAccount {
  network: BankNetwork;
  bankName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  country: string;
  verified?: boolean;
}

export interface CardAccount {
  network: BankNetwork;
  maskedPan: string;
  expiryMonth: number;
  expiryYear: number;
  country: string;
  verified?: boolean;
}

export interface CryptoAccount {
  network: string;
  address: string;
  tag?: string;
  verified?: boolean;
}

export type ExternalAccount =
  | MobileMoneyAccount
  | BankAccount
  | CardAccount
  | CryptoAccount;

/* -------------------------------------------------------------------------- */
/* TRANSACTION INTENT                                                         */
/* -------------------------------------------------------------------------- */

export interface PaymentIntent {
  amount: number;
  currency: CurrencyCode;
  rail: PaymentRail;

  operator?: MobileMoneyOperator;
  bankNetwork?: BankNetwork;

  fromWalletId?: string;
  toWalletId?: string;

  externalAccount?: ExternalAccount;

  description?: string;
  reference?: string;

  requiresEscrow?: boolean;
  requiresConfirmation?: boolean;

  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* OFFLINE PAYMENT SUPPORT                                                    */
/* -------------------------------------------------------------------------- */

export interface OfflineVoucher {
  voucherId: string;
  amount: number;
  currency: CurrencyCode;
  issuedAt: Date;
  expiresAt?: Date;
  signature: string;
}

/* -------------------------------------------------------------------------- */
/* EVENT CONTRACTS                                                            */
/* -------------------------------------------------------------------------- */

export type WalletEventType =
  | "WALLET_CREATED"
  | "BALANCE_UPDATED"
  | "FUNDS_LOCKED"
  | "FUNDS_UNLOCKED"
  | "WALLET_FROZEN"
  | "WALLET_UNFROZEN"
  | "LIMIT_REACHED"
  | "FRAUD_DETECTED"
  | "COMPLIANCE_UPDATED";

export interface WalletEvent {
  type: WalletEventType;
  walletId: string;
  timestamp: Date;
  payload?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* HUMAN READABLE HELPERS                                                     */
/* -------------------------------------------------------------------------- */

export const MOBILE_OPERATOR_LABELS: Record<
  MobileMoneyOperator,
  string
> = {
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
  VODACOM_MPESA: "Vodacom M-Pesa",
  MTN_MOMO: "MTN Mobile Money",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
  FREE_MONEY: "Free Money",
  TIGO_PESA: "Tigo Pesa",
  SAFARICOM_MPESA: "Safaricom M-Pesa",
  TELECEL_MONEY: "Telecel Money",
  GLO_MONEY: "Glo Money",
};
