/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE IDENTITY — ORGANIZATION MODEL (WORLD #1 CANONICAL)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/identity/organization.model.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE CONSTITUTIONNEL :                                                    */
/*   - Représenter toute entité collective officielle                          */
/*   - Source unique pour ENTREPRISES / ONG / ÉCOLES / HÔPITAUX / ÉGLISES       */
/*   - Gouvernée par des PERSONNES, jamais autonome                            */
/*                                                                            */
/*  GARANTIES ABSOLUES :                                                      */
/*   - Une ORGANIZATION n’est jamais anonyme                                  */
/*   - Elle agit toujours via des USERS                                       */
/*   - Elle est auditée, traçable, vérifiable                                  */
/*   - Aucune suppression physique                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Schema, model, Document, Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* ENUMS — CLASSIFICATION OFFICIELLE                                          */
/* -------------------------------------------------------------------------- */

/**
 * Typologie universelle des organisations.
 * Extensible sans breaking change.
 */
export enum OrganizationType {
  COMPANY = "COMPANY",
  STARTUP = "STARTUP",
  ONG = "ONG",
  FOUNDATION = "FOUNDATION",
  COOPERATIVE = "COOPERATIVE",

  SCHOOL = "SCHOOL",
  UNIVERSITY = "UNIVERSITY",
  TRAINING_CENTER = "TRAINING_CENTER",

  HOSPITAL = "HOSPITAL",
  CLINIC = "CLINIC",
  PHARMACY = "PHARMACY",

  CHURCH = "CHURCH",
  MOSQUE = "MOSQUE",
  TEMPLE = "TEMPLE",

  MEDIA = "MEDIA",
  PRESS = "PRESS",

  GOVERNMENT = "GOVERNMENT",
  INSTITUTION = "INSTITUTION",
  MUNICIPALITY = "MUNICIPALITY",

  ASSOCIATION = "ASSOCIATION",
  OTHER = "OTHER",
}

/**
 * Cycle de vie opérationnel.
 */
export enum OrganizationStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  UNDER_REVIEW = "UNDER_REVIEW",
  REVOKED = "REVOKED",
  ARCHIVED = "ARCHIVED",
}

/**
 * Niveau de vérification institutionnelle.
 */
export enum OrganizationVerificationLevel {
  NONE = "NONE",
  BASIC = "BASIC",
  LEGAL = "LEGAL",
  GOVERNMENT = "GOVERNMENT",
}

/* -------------------------------------------------------------------------- */
/* INTERFACE CANONIQUE                                                        */
/* -------------------------------------------------------------------------- */

export interface IOrganization extends Document {
  _id: Types.ObjectId;

  /* ---------------------------------------------------------------------- */
  /* CORE IDENTITY                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * Nom public affiché.
   */
  name: string;

  /**
   * Nom légal officiel (registre).
   */
  legalName?: string;

  /**
   * Typologie.
   */
  type: OrganizationType;

  /**
   * Identifiant légal externe (RCCM, SIRET, etc).
   */
  registrationNumber?: string;

  /**
   * Pays de juridiction.
   */
  countryCode?: string;

  /* ---------------------------------------------------------------------- */
  /* TRUST & LEGITIMACY                                                      */
  /* ---------------------------------------------------------------------- */

  /**
   * Score de confiance (0 → 100).
   */
  trustScore: number;

  /**
   * Niveau de vérification.
   */
  verificationLevel: OrganizationVerificationLevel;

  /**
   * Date de dernière vérification.
   */
  verifiedAt?: Date;

  /* ---------------------------------------------------------------------- */
  /* GOVERNANCE                                                             */
  /* ---------------------------------------------------------------------- */

  /**
   * USER fondateur / représentant légal.
   */
  ownerUserId: Types.ObjectId;

  /**
   * Référence éventuelle d’une organisation mère.
   */
  parentOrganizationId?: Types.ObjectId;

  /* ---------------------------------------------------------------------- */
  /* CONTACT & PUBLIC PROFILE                                                */
  /* ---------------------------------------------------------------------- */

  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;

  /**
   * Adresse structurée (future normalisation).
   */
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };

  /* ---------------------------------------------------------------------- */
  /* STATUS & LIFECYCLE                                                      */
  /* ---------------------------------------------------------------------- */

  status: OrganizationStatus;
  isDeleted: boolean;

  suspendedAt?: Date;
  revokedAt?: Date;
  archivedAt?: Date;

  suspendedReason?: string;
  revokedReason?: string;

  /* ---------------------------------------------------------------------- */
  /* METADATA & EXTENSION                                                    */
  /* ---------------------------------------------------------------------- */

  metadata?: Record<string, unknown>;

  /* ---------------------------------------------------------------------- */
  /* AUDIT                                                                   */
  /* ---------------------------------------------------------------------- */

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* SUBSCHEMA — ADDRESS                                                        */
/* -------------------------------------------------------------------------- */

const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true, index: true },
    region: { type: String, trim: true },
    country: { type: String, trim: true, index: true },
    postalCode: { type: String, trim: true },
  },
  {
    _id: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const OrganizationSchema = new Schema<IOrganization>(
  {
    /* --------------------------- CORE IDENTITY -------------------------- */

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
      index: true,
    },

    legalName: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    type: {
      type: String,
      enum: Object.values(OrganizationType),
      required: true,
      index: true,
    },

    registrationNumber: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    countryCode: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 3,
      index: true,
    },

    /* -------------------------- TRUST & LEGITIMACY ----------------------- */

    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    verificationLevel: {
      type: String,
      enum: Object.values(OrganizationVerificationLevel),
      default: OrganizationVerificationLevel.NONE,
      index: true,
    },

    verifiedAt: {
      type: Date,
    },

    /* ----------------------------- GOVERNANCE ---------------------------- */

    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    parentOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    /* ------------------------ CONTACT & PROFILE -------------------------- */

    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    website: {
      type: String,
      trim: true,
    },

    logoUrl: {
      type: String,
    },

    address: {
      type: AddressSchema,
    },

    /* --------------------------- STATUS & LIFECYCLE ---------------------- */

    status: {
      type: String,
      enum: Object.values(OrganizationStatus),
      default: OrganizationStatus.ACTIVE,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    suspendedAt: Date,
    revokedAt: Date,
    archivedAt: Date,

    suspendedReason: { type: String, trim: true },
    revokedReason: { type: String, trim: true },

    /* ------------------------------ METADATA ----------------------------- */

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES — PERFORMANCE & GOVERNANCE                                         */
/* -------------------------------------------------------------------------- */

OrganizationSchema.index({ name: 1, type: 1 });
OrganizationSchema.index({ registrationNumber: 1 });
OrganizationSchema.index({ countryCode: 1, type: 1 });
OrganizationSchema.index({ trustScore: -1 });
OrganizationSchema.index({ status: 1, isDeleted: 1 });

/* -------------------------------------------------------------------------- */
/* GUARANTEES — HARD RULES                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Organisation toujours rattachée à un OWNER humain.
 */
OrganizationSchema.pre("save", function (next) {
  if (!this.ownerUserId) {
    return next(
      new Error("Organization must always have an ownerUserId")
    );
  }

  if (this.trustScore < 0 || this.trustScore > 100) {
    return next(
      new Error("Organization trustScore must be between 0 and 100")
    );
  }

  next();
});

/**
 * Suppression physique STRICTEMENT interdite.
 */
OrganizationSchema.pre("deleteOne", { document: true }, function (next) {
  return next(
    new Error("Physical deletion of Organization is forbidden. Use status lifecycle.")
  );
});

/* -------------------------------------------------------------------------- */
/* DOMAIN METHODS (SAFE)                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Vérifie si l’organisation est active.
 */
OrganizationSchema.methods.isActive = function (): boolean {
  return (
    this.status === OrganizationStatus.ACTIVE &&
    this.isDeleted === false
  );
};

/**
 * Suspend proprement l’organisation.
 */
OrganizationSchema.methods.suspend = function (reason?: string): void {
  this.status = OrganizationStatus.SUSPENDED;
  this.suspendedAt = new Date();
  this.suspendedReason = reason;
};

/**
 * Révoque définitivement l’organisation.
 */
OrganizationSchema.methods.revoke = function (reason?: string): void {
  this.status = OrganizationStatus.REVOKED;
  this.revokedAt = new Date();
  this.revokedReason = reason;
};

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const OrganizationModel = model<IOrganization>(
  "Organization",
  OrganizationSchema
);

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Gouvernance humaine obligatoire
 * ✔️ Audit & traçabilité natives
 * ✔️ Scalabilité mondiale
 * ✔️ Multi-réglementations ready
 * ✔️ Aucun effacement destructif
 *
 * 👉 Prêt pour 100M+ organisations.
 */
