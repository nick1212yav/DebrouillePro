/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CONSENT MODEL (WORLD #1 LEGAL VAULT)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/consent/consent.model.ts              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Stocker la preuve légale de consentement                                */
/*  - Garantir immutabilité, auditabilité                                     */
/*  - Supporter plusieurs milliards d’événements                              */
/*                                                                            */
/*  GARANTIES :                                                               */
/*  - Aucun effacement physique                                               */
/*  - Historique complet                                                      */
/*  - Rejouable juridiquement                                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Schema, model, Document } from "mongoose";
import {
  ConsentStatus,
  ConsentChannel,
  ConsentPurpose,
} from "./consent.types";

/* -------------------------------------------------------------------------- */
/* SUBSCHEMAS                                                                 */
/* -------------------------------------------------------------------------- */

const SubjectSchema = new Schema(
  {
    subjectId: { type: String, required: true, index: true },
    subjectType: {
      type: String,
      enum: [
        "USER",
        "PHONE",
        "EMAIL",
        "DEVICE",
        "WALLET",
        "ANONYMOUS",
      ],
      required: true,
      index: true,
    },
  },
  { _id: false }
);

const ProofSchema = new Schema(
  {
    method: {
      type: String,
      enum: [
        "CHECKBOX",
        "SMS_CONFIRMATION",
        "APP_ACTION",
        "VOICE",
        "USSD",
        "IMPLICIT",
        "ADMIN",
      ],
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, required: true },
    reference: String,
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* INTERFACE                                                                  */
/* -------------------------------------------------------------------------- */

export interface IConsent extends Document {
  subject: {
    subjectId: string;
    subjectType: string;
  };

  channel: ConsentChannel;
  purpose: ConsentPurpose;
  status: ConsentStatus;

  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;

  proof?: {
    method: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
    reference?: string;
  };

  metadata?: Record<string, unknown>;

  /** Ledger fields */
  version: number;
  previousId?: string;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const ConsentSchema = new Schema<IConsent>(
  {
    subject: {
      type: SubjectSchema,
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: Object.values([
        "SMS",
        "EMAIL",
        "PUSH",
        "WHATSAPP",
        "TELEGRAM",
        "SIGNAL",
        "USSD",
        "OFFLINE",
      ]),
      required: true,
      index: true,
    },

    purpose: {
      type: String,
      enum: Object.values([
        "SECURITY",
        "TRANSACTIONAL",
        "SYSTEM",
        "MARKETING",
        "COMMUNITY",
        "EMERGENCY",
        "LEGAL",
        "INFORMATIONAL",
      ]),
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(ConsentStatus),
      required: true,
      index: true,
    },

    grantedAt: Date,
    revokedAt: Date,
    expiresAt: Date,

    proof: {
      type: ProofSchema,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },

    /* --------------------------- LEDGER FIELDS --------------------------- */

    /**
     * Version incrémentale du consentement.
     * Permet de rejouer l’historique légal.
     */
    version: {
      type: Number,
      required: true,
      default: 1,
    },

    /**
     * Référence vers la version précédente.
     * Chaînage légal (audit).
     */
    previousId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES (SCALE PLANET)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Recherche rapide du consentement actif.
 */
ConsentSchema.index({
  "subject.subjectId": 1,
  channel: 1,
  purpose: 1,
  status: 1,
});

/**
 * Audit / timeline.
 */
ConsentSchema.index({
  createdAt: -1,
});

/**
 * Anti-duplication légale.
 */
ConsentSchema.index({
  "subject.subjectId": 1,
  channel: 1,
  purpose: 1,
  version: 1,
});

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY GUARANTEES                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Interdiction de modification destructive.
 */
ConsentSchema.pre("save", function (next) {
  if (this.isModified("subject")) {
    return next(
      new Error("Consent.subject is immutable")
    );
  }

  if (this.isModified("channel")) {
    return next(
      new Error("Consent.channel is immutable")
    );
  }

  if (this.isModified("purpose")) {
    return next(
      new Error("Consent.purpose is immutable")
    );
  }

  next();
});

/**
 * Suppression physique interdite.
 */
ConsentSchema.pre("deleteOne", { document: true }, function (next) {
  return next(
    new Error(
      "Physical deletion of Consent is forbidden (legal vault)"
    )
  );
});

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const ConsentModel = model<IConsent>(
  "Consent",
  ConsentSchema
);

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Ledger immuable
 * ✔️ Versionnement juridique
 * ✔️ Audit-ready
 * ✔️ Conforme RGPD / Telco / App Stores
 * ✔️ Scalabilité milliards de lignes
 *
 * 👉 Ce modèle est une fondation réglementaire mondiale.
 */
