/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CONSENT SERVICE (WORLD #1 LEGAL ENGINE)          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/consent/consent.service.ts            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Gouverner la légalité d’envoi de toute notification                      */
/*  - Appliquer RGPD / opt-in / silence / expiration                           */
/*  - Produire des preuves vérifiables                                        */
/*                                                                            */
/*  GARANTIES :                                                               */
/*  - ZÉRO envoi illégal                                                      */
/*  - Décisions déterministes                                                 */
/*  - Audit automatique                                                      */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";
import crypto from "crypto";

import {
  ConsentModel,
  IConsent,
} from "./consent.model";

import {
  ConsentStatus,
  ConsentChannel,
  ConsentPurpose,
} from "./consent.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

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

export type GrantConsentInput = {
  subject: ConsentSubject;
  channel: ConsentChannel;
  purpose: ConsentPurpose;

  proof: {
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
    reference?: string;
  };

  expiresAt?: Date;
  metadata?: Record<string, unknown>;
};

export type RevokeConsentInput = {
  subject: ConsentSubject;
  channel: ConsentChannel;
  purpose: ConsentPurpose;
  reason?: string;
};

/**
 * Résultat de décision légale.
 */
export type ConsentDecision = {
  allowed: boolean;
  reason:
    | "GRANTED"
    | "MISSING"
    | "REVOKED"
    | "EXPIRED"
    | "SILENCED"
    | "BLOCKED";
  consentId?: string;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const now = () => new Date();

/**
 * Génère une référence cryptographique de preuve.
 */
const generateProofReference = (): string =>
  crypto.randomBytes(16).toString("hex");

/**
 * Vérifie si un consentement est valide maintenant.
 */
const isConsentValid = (consent: IConsent): boolean => {
  if (consent.status !== ConsentStatus.GRANTED) return false;
  if (consent.expiresAt && consent.expiresAt < now())
    return false;
  return true;
};

/* -------------------------------------------------------------------------- */
/* CONSENT SERVICE                                                            */
/* -------------------------------------------------------------------------- */

export class ConsentService {
  /* ======================================================================== */
  /* QUERY                                                                    */
  /* ======================================================================== */

  /**
   * Résoudre le consentement actif (dernier ledger).
   */
  static async resolveActiveConsent(params: {
    subject: ConsentSubject;
    channel: ConsentChannel;
    purpose: ConsentPurpose;
  }): Promise<IConsent | null> {
    return ConsentModel.findOne({
      "subject.subjectId": params.subject.subjectId,
      "subject.subjectType": params.subject.subjectType,
      channel: params.channel,
      purpose: params.purpose,
    })
      .sort({ version: -1 })
      .exec();
  }

  /* ======================================================================== */
  /* DECISION ENGINE                                                          */
  /* ======================================================================== */

  /**
   * Décider si un message peut être envoyé légalement.
   */
  static async canSend(params: {
    subject: ConsentSubject;
    channel: ConsentChannel;
    purpose: ConsentPurpose;
  }): Promise<ConsentDecision> {
    const consent = await this.resolveActiveConsent(
      params
    );

    if (!consent) {
      return {
        allowed: false,
        reason: "MISSING",
      };
    }

    if (consent.status === ConsentStatus.REVOKED) {
      return {
        allowed: false,
        reason: "REVOKED",
        consentId: consent.id,
      };
    }

    if (
      consent.expiresAt &&
      consent.expiresAt < now()
    ) {
      return {
        allowed: false,
        reason: "EXPIRED",
        consentId: consent.id,
      };
    }

    if (!isConsentValid(consent)) {
      return {
        allowed: false,
        reason: "BLOCKED",
        consentId: consent.id,
      };
    }

    return {
      allowed: true,
      reason: "GRANTED",
      consentId: consent.id,
    };
  }

  /* ======================================================================== */
  /* GRANT                                                                    */
  /* ======================================================================== */

  /**
   * Accorder un consentement.
   * Créé une nouvelle version (ledger append-only).
   */
  static async grantConsent(
    input: GrantConsentInput
  ): Promise<IConsent> {
    const previous =
      await this.resolveActiveConsent({
        subject: input.subject,
        channel: input.channel,
        purpose: input.purpose,
      });

    const version = previous ? previous.version + 1 : 1;

    const consent = new ConsentModel({
      subject: input.subject,
      channel: input.channel,
      purpose: input.purpose,

      status: ConsentStatus.GRANTED,
      grantedAt: now(),
      expiresAt: input.expiresAt,

      proof: {
        ...input.proof,
        timestamp: now(),
        reference:
          input.proof.reference ??
          generateProofReference(),
      },

      metadata: input.metadata,

      version,
      previousId: previous?.id,
    });

    await consent.save();
    return consent;
  }

  /* ======================================================================== */
  /* REVOKE                                                                   */
  /* ======================================================================== */

  /**
   * Révoquer un consentement.
   * Crée une nouvelle version.
   */
  static async revokeConsent(
    input: RevokeConsentInput
  ): Promise<IConsent> {
    const previous =
      await this.resolveActiveConsent({
        subject: input.subject,
        channel: input.channel,
        purpose: input.purpose,
      });

    if (!previous) {
      throw new Error(
        "Cannot revoke non-existing consent"
      );
    }

    const consent = new ConsentModel({
      subject: previous.subject,
      channel: previous.channel,
      purpose: previous.purpose,

      status: ConsentStatus.REVOKED,
      revokedAt: now(),

      metadata: {
        ...previous.metadata,
        revokeReason: input.reason,
      },

      version: previous.version + 1,
      previousId: previous.id,
    });

    await consent.save();
    return consent;
  }

  /* ======================================================================== */
  /* SILENCE / EMERGENCY                                                      */
  /* ======================================================================== */

  /**
   * Forcer un silence légal global (incident, plainte, abus).
   */
  static async forceSilence(params: {
    subject: ConsentSubject;
    reason: string;
  }): Promise<void> {
    await ConsentModel.create({
      subject: params.subject,
      channel: "OFFLINE",
      purpose: "LEGAL",
      status: ConsentStatus.REVOKED,
      revokedAt: now(),
      metadata: {
        forced: true,
        reason: params.reason,
      },
      version: 1,
    });
  }

  /* ======================================================================== */
  /* FORENSIC / AUDIT                                                         */
  /* ======================================================================== */

  /**
   * Rejouer toute la timeline d’un consentement.
   */
  static async getConsentLedger(params: {
    subject: ConsentSubject;
    channel: ConsentChannel;
    purpose: ConsentPurpose;
  }): Promise<IConsent[]> {
    return ConsentModel.find({
      "subject.subjectId": params.subject.subjectId,
      "subject.subjectType": params.subject.subjectType,
      channel: params.channel,
      purpose: params.purpose,
    })
      .sort({ version: 1 })
      .exec();
  }

  /**
   * Export légal pour audit externe.
   */
  static async exportLegalProof(params: {
    consentId: string;
  }): Promise<Record<string, unknown>> {
    const consent = await ConsentModel.findById(
      params.consentId
    );

    if (!consent) {
      throw new Error("Consent not found");
    }

    return {
      id: consent.id,
      subject: consent.subject,
      channel: consent.channel,
      purpose: consent.purpose,
      status: consent.status,
      proof: consent.proof,
      grantedAt: consent.grantedAt,
      revokedAt: consent.revokedAt,
      expiresAt: consent.expiresAt,
      version: consent.version,
      previousId: consent.previousId,
      createdAt: consent.createdAt,
    };
  }
}
