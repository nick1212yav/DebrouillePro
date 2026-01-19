/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CONSENT TYPES (WORLD #1 CANONICAL)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/consent/consent.types.ts              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Définir les contrats universels de consentement                          */
/*  - Être juridiquement traçable                                              */
/*  - Normaliser tous les canaux                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* CONSENT SUBJECT                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Sujet concerné par le consentement.
 * Peut être un utilisateur, un device, un numéro, un wallet.
 */
export type ConsentSubject = {
  subjectId: string;
  subjectType:
    | "USER"
    | "PHONE"
    | "EMAIL"
    | "DEVICE"
    | "WALLET"
    | "ANONYMOUS";
};

/* -------------------------------------------------------------------------- */
/* CHANNELS                                                                   */
/* -------------------------------------------------------------------------- */

export type ConsentChannel =
  | "SMS"
  | "EMAIL"
  | "PUSH"
  | "WHATSAPP"
  | "TELEGRAM"
  | "SIGNAL"
  | "USSD"
  | "OFFLINE";

/* -------------------------------------------------------------------------- */
/* PURPOSES (LEGAL BASE)                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Finalité légale de l’envoi.
 * Obligatoire pour conformité.
 */
export type ConsentPurpose =
  | "SECURITY"
  | "TRANSACTIONAL"
  | "SYSTEM"
  | "MARKETING"
  | "COMMUNITY"
  | "EMERGENCY"
  | "LEGAL"
  | "INFORMATIONAL";

/* -------------------------------------------------------------------------- */
/* CONSENT STATUS                                                             */
/* -------------------------------------------------------------------------- */

export enum ConsentStatus {
  GRANTED = "GRANTED",
  DENIED = "DENIED",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
}

/* -------------------------------------------------------------------------- */
/* LEGAL PROOF                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Preuve légale de consentement.
 * Obligatoire en audit.
 */
export interface ConsentProof {
  method:
    | "CHECKBOX"
    | "SMS_CONFIRMATION"
    | "APP_ACTION"
    | "VOICE"
    | "USSD"
    | "IMPLICIT"
    | "ADMIN";
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  reference?: string; // capture, transactionId, logId
}

/* -------------------------------------------------------------------------- */
/* CONSENT RECORD                                                             */
/* -------------------------------------------------------------------------- */

export interface ConsentRecord {
  subject: ConsentSubject;
  channel: ConsentChannel;
  purpose: ConsentPurpose;
  status: ConsentStatus;

  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;

  proof?: ConsentProof;

  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* CONSENT DECISION                                                           */
/* -------------------------------------------------------------------------- */

export interface ConsentDecision {
  allowed: boolean;
  reason:
    | "CONSENT_GRANTED"
    | "CONSENT_DENIED"
    | "CONSENT_MISSING"
    | "CONSENT_EXPIRED"
    | "QUIET_HOURS"
    | "RATE_LIMIT"
    | "BLACKLISTED"
    | "LEGAL_OVERRIDE";
  consent?: ConsentRecord;
}

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

export const CONSENT_INVARIANTS = {
  CONSENT_IS_CHANNEL_SPECIFIC: true,
  CONSENT_IS_PURPOSE_BOUND: true,
  CONSENT_IS_REVOCABLE: true,
  CONSENT_MUST_BE_PROVABLE: true,
  SILENCE_IS_ALWAYS_RESPECTED: true,
} as const;
