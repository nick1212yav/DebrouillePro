/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — PAYMENT PROVIDER INTERFACE (WORLD CONTRACT v1)            */
/*  File: backend/src/core/pay/providers/provider.interface.ts                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  CE FICHIER EST UN CONTRAT SACRÉ                                            */
/*                                                                            */
/*  - PAY Core ne dépend JAMAIS d’un provider concret                          */
/*  - Tous les providers implémentent STRICTEMENT ce contrat                  */
/*  - Interface pensée pour durer 10–15 ans                                   */
/*  - Compatible Mobile Money, Cartes, Banque, Wallet, Crypto (futur)         */
/*  - Sécurité, audit, IA, conformité intégrés by design                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { CurrencyCode } from "../pay.types";

/* -------------------------------------------------------------------------- */
/* GLOBAL TYPES                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Méthodes de paiement universelles.
 * Extensible sans breaking change.
 */
export type PaymentMethod =
  | "MOBILE_MONEY"
  | "CARD"
  | "BANK_TRANSFER"
  | "USSD"
  | "QR"
  | "WALLET"
  | "CRYPTO";

/**
 * Niveau de risque intrinsèque d’un provider.
 * Utilisé par ProviderFactory + IA.
 */
export type ProviderRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

/**
 * Environnement d’exécution.
 */
export type ProviderEnvironment =
  | "SANDBOX"
  | "STAGING"
  | "PRODUCTION";

/* -------------------------------------------------------------------------- */
/* PROVIDER CONFIG (ROUTING & GOVERNANCE)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Configuration déclarative d’un provider dans le système.
 * Utilisée par le ProviderFactory pour le routing intelligent.
 */
export interface ProviderConfig {
  /** Nom canonique du provider (doit matcher PaymentProvider.name) */
  name: string;

  /** Environnement ciblé */
  environment: ProviderEnvironment;

  /** Activation dynamique */
  enabled: boolean;

  /**
   * Poids de préférence (routing intelligent).
   * > 1 = favorisé
   * < 1 = pénalisé
   * Par défaut = 1.0
   */
  weight?: number;
}

/* -------------------------------------------------------------------------- */
/* PROVIDER CAPABILITIES                                                      */
/* -------------------------------------------------------------------------- */

export interface ProviderCapabilities {
  /** Nom canonique */
  name: string;

  /** Méthodes supportées */
  methods: PaymentMethod[];

  /** Pays supportés (ISO-2) */
  supportedCountries: string[];

  /** Devises supportées */
  supportedCurrencies: CurrencyCode[];

  /** Régions prioritaires (optimisation routing) */
  primaryRegions?: string[];

  /** Limites */
  minAmount?: number;
  maxAmount?: number;

  /** Coûts moyens (%) */
  feesPercent?: number;

  /** Webhooks */
  supportsWebhooks: boolean;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  supportsReconciliation: boolean;

  /** Sécurité */
  supportsSignatureValidation: boolean;
  supportsIdempotency: boolean;

  /** Qualité de service */
  slaUptime?: number;        // %
  avgLatencyMs?: number;     // indicatif

  /** Conformité */
  pciCompliant?: boolean;
  gdprCompliant?: boolean;
  dataResidency?: string[];

  /** Analyse de risque */
  riskLevel?: ProviderRiskLevel;
}

/* -------------------------------------------------------------------------- */
/* PAYMENT INIT                                                               */
/* -------------------------------------------------------------------------- */

export interface ProviderPaymentRequest {
  /** Référence globale Débrouille (idempotence) */
  reference: string;

  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;

  /** Informations client (KYC soft) */
  customer: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
    ipAddress?: string;
  };

  /** Contexte fonctionnel */
  description?: string;
  metadata?: Record<string, unknown>;

  /** URLs */
  callbackUrl?: string;        // redirect utilisateur
  webhookUrl: string;          // endpoint unique PAY

  /** Sécurité */
  idempotencyKey?: string;
  expiresAt?: Date;
}

export interface ProviderPaymentResponse {
  providerReference: string;
  status:
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "REQUIRES_ACTION";

  /** URL de redirection si nécessaire */
  redirectUrl?: string;

  /** Instructions USSD / QR / DeepLink */
  actionPayload?: {
    type: "USSD" | "QR" | "DEEPLINK";
    value: string;
  };

  /** Normalisation interne */
  normalized?: {
    provider: string;
    fee?: number;
    estimatedSettlementAt?: Date;
  };

  /** Réponse brute conservée pour audit */
  raw: unknown;
}

/* -------------------------------------------------------------------------- */
/* REFUND                                                                     */
/* -------------------------------------------------------------------------- */

export interface ProviderRefundRequest {
  providerReference: string;
  amount?: number;            // refund partiel
  reason?: string;
  idempotencyKey?: string;
}

export interface ProviderRefundResponse {
  status: "PENDING" | "SUCCESS" | "FAILED";
  providerRefundReference?: string;
  raw: unknown;
}

/* -------------------------------------------------------------------------- */
/* WEBHOOK                                                                    */
/* -------------------------------------------------------------------------- */

export interface ProviderWebhookPayload {
  provider: string;
  event: string;

  /** Référence Débrouille */
  reference: string;

  /** Référence provider */
  providerReference?: string;

  status: string;

  amount?: number;
  currency?: CurrencyCode;

  customer?: {
    phone?: string;
    email?: string;
  };

  occurredAt?: Date;

  /** Payload brut signé */
  raw: unknown;
}

/* -------------------------------------------------------------------------- */
/* HEALTH & OBSERVABILITY                                                     */
/* -------------------------------------------------------------------------- */

export interface ProviderHealthStatus {
  provider: string;
  environment: ProviderEnvironment;
  online: boolean;
  latencyMs?: number;
  lastCheckedAt: Date;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/* PROVIDER INTERFACE (ABSOLUTE CONTRACT)                                     */
/* -------------------------------------------------------------------------- */

export interface PaymentProvider {
  /** Identité canonique */
  readonly name: string;

  /** Environnement actif */
  readonly environment: ProviderEnvironment;

  /* ---------------------------------------------------------------------- */
  /* CAPABILITIES                                                           */
  /* ---------------------------------------------------------------------- */

  getCapabilities(): ProviderCapabilities;

  /* ---------------------------------------------------------------------- */
  /* PAYMENTS                                                               */
  /* ---------------------------------------------------------------------- */

  initiatePayment(
    payload: ProviderPaymentRequest
  ): Promise<ProviderPaymentResponse>;

  /* ---------------------------------------------------------------------- */
  /* REFUNDS                                                                */
  /* ---------------------------------------------------------------------- */

  refundPayment(
    payload: ProviderRefundRequest
  ): Promise<ProviderRefundResponse>;

  /* ---------------------------------------------------------------------- */
  /* WEBHOOKS                                                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Vérifier signature / authenticité du webhook.
   * DOIT être ultra rapide et sans side effects.
   */
  validateWebhookSignature(
    headers: Record<string, unknown>,
    body: unknown
  ): Promise<boolean>;

  /**
   * Parser et normaliser un webhook valide.
   */
  parseWebhook(
    headers: Record<string, unknown>,
    body: unknown
  ): Promise<ProviderWebhookPayload>;

  /* ---------------------------------------------------------------------- */
  /* OBSERVABILITY                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * Vérifier la santé du provider.
   * Utilisé par routing intelligent et monitoring.
   */
  healthCheck?(): Promise<ProviderHealthStatus>;

  /**
   * Optionnel : synchronisation / reconciliation batch.
   */
  reconcile?(
    from: Date,
    to: Date
  ): Promise<Array<ProviderWebhookPayload>>;
}
