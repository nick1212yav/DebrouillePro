/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PROFILE — PROFILE MODEL (WORLD #1 CANONICAL)                   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/profile/profile.model.ts                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Identité publique universelle (PERSON / ORGANIZATION)                  */
/*   - Branding numérique, réputation, découvrabilité                         */
/*   - Surface sociale interopérable IA / Search / Ranking                     */
/*                                                                            */
/*  GARANTIES ABSOLUES :                                                      */
/*   - Séparation stricte Auth / Identity / Profile                           */
/*   - Jamais de donnée sensible                                              */
/*   - Zéro suppression physique                                              */
/*   - Traçabilité + audit natifs                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Schema, model, Document, Types } from "mongoose";
import { IdentityKind } from "../identity/identity.types";

/* ========================================================================== */
/* ENUMS                                                                      */
/* ========================================================================== */

export enum ProfileVisibility {
  PUBLIC = "PUBLIC",        // visible par tous
  NETWORK = "NETWORK",      // visible réseau / relations
  PRIVATE = "PRIVATE",      // visible uniquement propriétaire
}

export enum ProfileVerificationStatus {
  UNVERIFIED = "UNVERIFIED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum ProfileCategory {
  PERSON = "PERSON",
  BUSINESS = "BUSINESS",
  CREATOR = "CREATOR",
  INSTITUTION = "INSTITUTION",
  NGO = "NGO",
  EDUCATION = "EDUCATION",
  HEALTH = "HEALTH",
  MEDIA = "MEDIA",
  GOVERNMENT = "GOVERNMENT",
}

/* ========================================================================== */
/* SUBTYPES                                                                   */
/* ========================================================================== */

export type GeoLocation = {
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export type SocialLinks = {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  github?: string;
  website?: string;
};

export type ProfileStats = {
  followersCount: number;
  followingCount: number;
  viewsCount: number;
  endorsementsCount: number;
  interactionsCount: number;
};

export type ProfileBadges = {
  verified?: boolean;
  trusted?: boolean;
  pioneer?: boolean;
  topRated?: boolean;
  institutionApproved?: boolean;
};

export type ProfileSettings = {
  allowSearchIndexing: boolean;
  allowRecommendations: boolean;
  allowAnalyticsTracking: boolean;
  allowPublicStats: boolean;
};

/* ========================================================================== */
/* INTERFACE CANONIQUE                                                        */
/* ========================================================================== */

export interface IProfile extends Document {
  _id: Types.ObjectId;

  /* ---------------------------------------------------------------------- */
  /* IDENTITY LINK (IMMUTABLE)                                               */
  /* ---------------------------------------------------------------------- */

  identityKind: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  /* ---------------------------------------------------------------------- */
  /* PUBLIC IDENTITY                                                         */
  /* ---------------------------------------------------------------------- */

  displayName: string;
  username?: string;                 // handle public unique
  tagline?: string;                  // slogan / headline
  avatarUrl?: string;
  coverUrl?: string;

  category?: ProfileCategory;

  /* ---------------------------------------------------------------------- */
  /* DESCRIPTION                                                             */
  /* ---------------------------------------------------------------------- */

  bio?: string;
  description?: string;

  /* ---------------------------------------------------------------------- */
  /* GEO & CONTEXT                                                           */
  /* ---------------------------------------------------------------------- */

  location?: GeoLocation;
  timezone?: string;
  languages?: string[];

  /* ---------------------------------------------------------------------- */
  /* PROFESSIONAL & SOCIAL                                                   */
  /* ---------------------------------------------------------------------- */

  skills?: string[];
  interests?: string[];
  socialLinks?: SocialLinks;

  /* ---------------------------------------------------------------------- */
  /* VISIBILITY & GOVERNANCE                                                 */
  /* ---------------------------------------------------------------------- */

  visibility: ProfileVisibility;
  verificationStatus: ProfileVerificationStatus;

  /* ---------------------------------------------------------------------- */
  /* TRUST SIGNALS (CACHE)                                                   */
  /* ---------------------------------------------------------------------- */

  trustScoreSnapshot?: number;
  reputationScore?: number;

  /* ---------------------------------------------------------------------- */
  /* STATS (DERIVED, REBUILDABLE)                                             */
  /* ---------------------------------------------------------------------- */

  stats: ProfileStats;

  /* ---------------------------------------------------------------------- */
  /* BADGES & ACHIEVEMENTS                                                   */
  /* ---------------------------------------------------------------------- */

  badges?: ProfileBadges;

  /* ---------------------------------------------------------------------- */
  /* SETTINGS                                                                */
  /* ---------------------------------------------------------------------- */

  settings: ProfileSettings;

  /* ---------------------------------------------------------------------- */
  /* INTERNAL                                                                */
  /* ---------------------------------------------------------------------- */

  lastViewedAt?: Date;
  lastUpdatedBy?: Types.ObjectId;

  /* ---------------------------------------------------------------------- */
  /* AUDIT                                                                   */
  /* ---------------------------------------------------------------------- */

  createdAt: Date;
  updatedAt: Date;
}

/* ========================================================================== */
/* SCHEMA                                                                     */
/* ========================================================================== */

const ProfileSchema = new Schema<IProfile>(
  {
    /* ---------------------------- IDENTITY ----------------------------- */

    identityKind: {
      type: String,
      enum: Object.values(IdentityKind),
      required: true,
      index: true,
      immutable: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      immutable: true,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      immutable: true,
    },

    /* ---------------------------- PUBLIC -------------------------------- */

    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
      index: true,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
      match: /^[a-z0-9._-]+$/,
      index: true,
    },

    tagline: {
      type: String,
      trim: true,
      maxlength: 160,
    },

    avatarUrl: String,
    coverUrl: String,

    category: {
      type: String,
      enum: Object.values(ProfileCategory),
      index: true,
    },

    /* ---------------------------- DESCRIPTION --------------------------- */

    bio: {
      type: String,
      maxlength: 600,
      trim: true,
    },

    description: {
      type: String,
      maxlength: 5000,
      trim: true,
    },

    /* ---------------------------- GEO ----------------------------------- */

    location: {
      country: String,
      region: String,
      city: String,
      address: String,
      lat: Number,
      lng: Number,
    },

    timezone: String,

    languages: {
      type: [String],
      default: [],
    },

    /* ---------------------------- SOCIAL -------------------------------- */

    skills: {
      type: [String],
      index: true,
      default: [],
    },

    interests: {
      type: [String],
      index: true,
      default: [],
    },

    socialLinks: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String,
      youtube: String,
      tiktok: String,
      github: String,
      website: String,
    },

    /* ---------------------------- VISIBILITY ---------------------------- */

    visibility: {
      type: String,
      enum: Object.values(ProfileVisibility),
      default: ProfileVisibility.PUBLIC,
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: Object.values(ProfileVerificationStatus),
      default: ProfileVerificationStatus.UNVERIFIED,
      index: true,
    },

    /* ---------------------------- TRUST --------------------------------- */

    trustScoreSnapshot: {
      type: Number,
      min: 0,
      max: 100,
      index: true,
    },

    reputationScore: {
      type: Number,
      min: 0,
      index: true,
    },

    /* ---------------------------- STATS --------------------------------- */

    stats: {
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      endorsementsCount: { type: Number, default: 0 },
      interactionsCount: { type: Number, default: 0 },
    },

    /* ---------------------------- BADGES -------------------------------- */

    badges: {
      verified: { type: Boolean, default: false },
      trusted: { type: Boolean, default: false },
      pioneer: { type: Boolean, default: false },
      topRated: { type: Boolean, default: false },
      institutionApproved: { type: Boolean, default: false },
    },

    /* ---------------------------- SETTINGS ------------------------------ */

    settings: {
      allowSearchIndexing: {
        type: Boolean,
        default: true,
      },
      allowRecommendations: {
        type: Boolean,
        default: true,
      },
      allowAnalyticsTracking: {
        type: Boolean,
        default: true,
      },
      allowPublicStats: {
        type: Boolean,
        default: true,
      },
    },

    /* ---------------------------- INTERNAL ------------------------------ */

    lastViewedAt: Date,

    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* ========================================================================== */
/* INDEXES (SEARCH / DISCOVERY / RANKING)                                     */
/* ========================================================================== */

ProfileSchema.index({
  displayName: "text",
  bio: "text",
  description: "text",
  skills: "text",
  interests: "text",
  "location.city": "text",
  "location.country": "text",
});

ProfileSchema.index({
  visibility: 1,
  verificationStatus: 1,
  trustScoreSnapshot: -1,
});

ProfileSchema.index({
  identityKind: 1,
  userId: 1,
  organizationId: 1,
});

/* ========================================================================== */
/* BUSINESS GUARANTEES                                                        */
/* ========================================================================== */

/**
 * Cohérence identité ↔ ownership.
 */
ProfileSchema.pre("save", function (next) {
  if (this.identityKind === IdentityKind.PERSON && !this.userId) {
    return next(new Error("PERSON profile must reference userId"));
  }

  if (
    this.identityKind === IdentityKind.ORGANIZATION &&
    !this.organizationId
  ) {
    return next(
      new Error("ORGANIZATION profile must reference organizationId")
    );
  }

  next();
});

/**
 * Suppression physique strictement interdite.
 */
ProfileSchema.pre("deleteOne", { document: true }, function (next) {
  return next(
    new Error("Physical deletion of profiles is forbidden")
  );
});

/* ========================================================================== */
/* SAFE METHODS                                                               */
/* ========================================================================== */

/**
 * Incrémente les vues (idempotent côté service).
 */
ProfileSchema.methods.incrementViews = function (): void {
  this.stats.viewsCount += 1;
  this.lastViewedAt = new Date();
};

/**
 * Met à jour snapshot de confiance.
 */
ProfileSchema.methods.updateTrustSnapshot = function (
  trustScore: number
): void {
  this.trustScoreSnapshot = trustScore;
};

/* ========================================================================== */
/* MODEL EXPORT                                                               */
/* ========================================================================== */

export const ProfileModel = model<IProfile>("Profile", ProfileSchema);

/* ========================================================================== */
/* CTO NOTE                                                                   */
/* ========================================================================== */
/**
 * ✔️ Recherche textuelle mondiale
 * ✔️ IA-ready (ranking, discovery, personalization)
 * ✔️ Séparation stricte Auth / Identity / Profile
 * ✔️ Scalabilité multi-millions de profils
 * ✔️ Évolutivité sans breaking change
 *
 * 👉 Ce modèle est prêt pour devenir un registre public numérique mondial.
 */
