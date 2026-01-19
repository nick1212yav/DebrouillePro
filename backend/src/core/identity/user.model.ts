/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE IDENTITY — USER MODEL (WORLD #1 HUMAN IDENTITY CORE)           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/identity/user.model.ts                              */
/* -------------------------------------------------------------------------- */

import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* ENUMS — CONSTITUTION                                                       */
/* -------------------------------------------------------------------------- */

export enum AccountType {
  PERSON = "PERSON",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
  DECEASED = "DECEASED",
}

export enum VerificationLevel {
  NONE = "NONE",
  BASIC = "BASIC",
  LEGAL = "LEGAL",
  BIOMETRIC = "BIOMETRIC",
}

export enum AccountOrigin {
  SELF = "SELF",
  INVITED = "INVITED",
  INSTITUTION = "INSTITUTION",
  MIGRATED = "MIGRATED",
}

/* -------------------------------------------------------------------------- */
/* SUBTYPES                                                                   */
/* -------------------------------------------------------------------------- */

export type ContactVerification = {
  value: string;
  verifiedAt?: Date;
};

export type RiskSignal = {
  code: string;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  at: Date;
  source?: string;
};

/* -------------------------------------------------------------------------- */
/* INTERFACE CANONIQUE                                                        */
/* -------------------------------------------------------------------------- */

export interface IUser extends Document {
  _id: Types.ObjectId;

  accountType: AccountType.PERSON;
  origin: AccountOrigin;
  publicId: string;

  phone?: ContactVerification;
  email?: ContactVerification;

  passwordHash?: string;
  biometricHash?: string;

  trustScore: number;
  verificationLevel: VerificationLevel;
  riskSignals?: RiskSignal[];

  status: UserStatus;
  isDeleted: boolean;

  suspendedReason?: string;
  bannedReason?: string;

  lastLoginAt?: Date;
  lastActivityAt?: Date;

  passwordChangedAt?: Date;
  securityVersion: number;

  consentAcceptedAt?: Date;
  gdprErasedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const generatePublicId = (): string =>
  `usr_${crypto.randomBytes(10).toString("hex")}`;

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const UserSchema = new Schema<IUser>(
  {
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
      immutable: true,
      default: AccountType.PERSON,
    },

    origin: {
      type: String,
      enum: Object.values(AccountOrigin),
      default: AccountOrigin.SELF,
    },

    /**
     * ⚠️ unique crée déjà un index automatiquement.
     * On ne redéclare PAS un index plus bas.
     */
    publicId: {
      type: String,
      unique: true,
      immutable: true,
    },

    /* --------------------------- CONTACT -------------------------------- */

    phone: {
      value: {
        type: String,
        trim: true,
      },
      verifiedAt: {
        type: Date,
      },
    },

    email: {
      value: {
        type: String,
        lowercase: true,
        trim: true,
      },
      verifiedAt: {
        type: Date,
      },
    },

    passwordHash: {
      type: String,
      select: false,
    },

    biometricHash: {
      type: String,
      select: false,
    },

    /* --------------------------- TRUST ---------------------------------- */

    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    verificationLevel: {
      type: String,
      enum: Object.values(VerificationLevel),
      default: VerificationLevel.NONE,
    },

    riskSignals: {
      type: [
        {
          code: String,
          level: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          },
          at: Date,
          source: String,
        },
      ],
      default: undefined,
    },

    /* --------------------------- STATUS --------------------------------- */

    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    suspendedReason: {
      type: String,
      trim: true,
    },

    bannedReason: {
      type: String,
      trim: true,
    },

    lastLoginAt: Date,
    lastActivityAt: Date,

    /* --------------------------- SECURITY -------------------------------- */

    passwordChangedAt: Date,

    securityVersion: {
      type: Number,
      default: 1,
    },

    /* --------------------------- COMPLIANCE ------------------------------ */

    consentAcceptedAt: Date,
    gdprErasedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES — WORLD SCALE (SINGLE SOURCE OF TRUTH)                             */
/* -------------------------------------------------------------------------- */

UserSchema.index({ "phone.value": 1 }, { sparse: true });
UserSchema.index({ "email.value": 1 }, { sparse: true });
UserSchema.index({ trustScore: -1 });
UserSchema.index({ verificationLevel: 1 });
UserSchema.index({ status: 1, isDeleted: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ origin: 1 });

/* ❌ SUPPRIMÉ : doublon avec unique:true
UserSchema.index({ publicId: 1 }, { unique: true });
*/

/* -------------------------------------------------------------------------- */
/* GUARANTEES — IMMUTABILITY                                                  */
/* -------------------------------------------------------------------------- */

UserSchema.pre("validate", function (next) {
  if (!this.publicId) {
    this.publicId = generatePublicId();
  }

  if (this.accountType !== AccountType.PERSON) {
    return next(
      new Error("User.accountType must always be PERSON")
    );
  }

  if (!this.phone?.value && !this.email?.value) {
    return next(
      new Error("User must have at least phone or email")
    );
  }

  next();
});

UserSchema.pre("deleteOne", { document: true }, function (next) {
  return next(
    new Error(
      "Physical deletion of users is forbidden. Use soft delete."
    )
  );
});

/* -------------------------------------------------------------------------- */
/* DOMAIN METHODS                                                             */
/* -------------------------------------------------------------------------- */

UserSchema.methods.isActive = function (): boolean {
  return (
    this.status === UserStatus.ACTIVE &&
    this.isDeleted === false
  );
};

UserSchema.methods.addRiskSignal = function (
  code: string,
  level: RiskSignal["level"],
  source?: string
): void {
  this.riskSignals = [
    ...(this.riskSignals ?? []),
    { code, level, at: new Date(), source },
  ];
};

UserSchema.methods.bumpSecurityVersion = function (): void {
  this.securityVersion += 1;
};

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const UserModel = model<IUser>("User", UserSchema);
