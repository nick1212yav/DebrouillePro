import { CurrencyCode } from "../pay.types";

export type ProviderName =
  | "FLUTTERWAVE"
  | "CINETPAY"
  | "PAYSTACK"
  | "STRIPE"
  | "SANDBOX";

export type ProviderEnvironment =
  | "SANDBOX"
  | "STAGING"
  | "PRODUCTION";

export type ProviderRegion =
  | "AFRICA_WEST"
  | "AFRICA_CENTRAL"
  | "AFRICA_EAST"
  | "AFRICA_SOUTH"
  | "EUROPE"
  | "NORTH_AMERICA"
  | "GLOBAL";

export type PaymentMethod =
  | "MOBILE_MONEY"
  | "CARD"
  | "BANK_TRANSFER"
  | "USSD"
  | "QR"
  | "WALLET";

export type MobileMoneyNetwork =
  | "ORANGE"
  | "AIRTEL"
  | "VODACOM"
  | "MTN"
  | "MOOV"
  | "WAVE"
  | "FREE"
  | "TIGO"
  | "SAFARICOM"
  | "TELKOM"
  | "OTHER";

export type ProviderRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type ProviderReliabilityTier =
  | "TIER_1"
  | "TIER_2"
  | "TIER_3";

export interface ProviderSelectionContext {
  country: string;
  region?: ProviderRegion;
  currency: CurrencyCode;
  method: PaymentMethod;
  mobileNetwork?: MobileMoneyNetwork;
  ownerType: "PERSON" | "ORGANIZATION";
  trustScore?: number;
  verificationLevel?: number;
  amount?: number;
  module?: string;
  entityId?: string;
  ipCountry?: string;
  isRetry?: boolean;
  retryCount?: number;
  preferredProvider?: ProviderName;
  avoidProviders?: ProviderName[];
}

export interface ProviderScoreBreakdown {
  provider: ProviderName;
  finalScore: number;
  metrics: {
    successRate?: number;
    errorRate?: number;
    latencyMs?: number;
    feesPercent?: number;
  };
}

export interface ProviderSelectionResult {
  provider: ProviderName;
  reason: string;
  confidenceScore: number;
  breakdown: ProviderScoreBreakdown[];
  fallbacks?: ProviderName[];
  decisionMeta?: {
    latencyScore?: number;
    costScore?: number;
    reliabilityScore?: number;
    riskScore?: number;
  };
}

export type NormalizedPaymentStatus =
  | "PENDING"
  | "REQUIRES_ACTION"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";

export type NormalizedEventType =
  | "PAYMENT_CREATED"
  | "PAYMENT_REQUIRES_ACTION"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED"
  | "REFUND_REQUESTED"
  | "REFUND_SUCCESS"
  | "REFUND_FAILED"
  | "DISPUTE_OPENED"
  | "DISPUTE_RESOLVED";

export interface NormalizedWebhookEvent {
  provider: ProviderName;
  environment?: ProviderEnvironment;
  eventType: NormalizedEventType;
  status: NormalizedPaymentStatus;
  reference: string;
  providerReference?: string;
  amount?: number;
  currency?: CurrencyCode;
  country?: string;
  method?: PaymentMethod;
  mobileNetwork?: MobileMoneyNetwork;
  occurredAt?: Date;
  receivedAt: Date;
  signatureValid?: boolean;
  replayDetected?: boolean;
  raw: unknown;
}

export type ProviderErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNSUPPORTED_METHOD"
  | "UNSUPPORTED_CURRENCY"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_FAILED"
  | "SIGNATURE_INVALID"
  | "RATE_LIMITED"
  | "FRAUD_SUSPECTED"
  | "INSUFFICIENT_FUNDS"
  | "UNKNOWN_ERROR";

export interface ProviderError {
  provider: ProviderName;
  environment?: ProviderEnvironment;
  code: ProviderErrorCode;
  message: string;
  reference?: string;
  providerReference?: string;
  retryable?: boolean;
  raw?: unknown;
}

export interface ProviderConfig {
  name: ProviderName;
  environment: ProviderEnvironment;
  enabled: boolean;
  priority?: number;
  weight?: number;
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
  timeoutMs?: number;
  dailyVolumeLimit?: number;
  monthlyVolumeLimit?: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
  monitoringEnabled?: boolean;
}

export interface ProviderHealthStatus {
  provider: ProviderName;
  environment: ProviderEnvironment;
  available: boolean;
  degraded?: boolean;
  latencyMs?: number;
  successRate24h?: number;
  errorRate24h?: number;
  lastIncidentAt?: Date;
  checkedAt: Date;
  message?: string;
}

export interface ProviderScoreSnapshot {
  provider: ProviderName;
  reliability: number;
  costEfficiency: number;
  latency: number;
  fraudRisk: number;
  volumeProcessed24h?: number;
  successRate24h?: number;
  updatedAt: Date;
}
