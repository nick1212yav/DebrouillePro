/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE AUTH — AUTH SESSION MODEL (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/auth/auth.session.model.ts                         */
/* -------------------------------------------------------------------------- */

import { Schema, model, Types, Model } from "mongoose";

import {
  AuthProvider,
  SessionStatus,
} from "./auth.types";

import { IdentityRef } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* DEVICE CONTEXT (LOCAL, ISOLÉ)                                              */
/* -------------------------------------------------------------------------- */

export type DeviceContext = {
  deviceId?: string;
  deviceName?: string;
  platform?: "WEB" | "MOBILE" | "API" | "IOT";
  os?: string;
  appVersion?: string;
};

/* -------------------------------------------------------------------------- */
/* DOCUMENT INTERFACE                                                         */
/* -------------------------------------------------------------------------- */

export interface IAuthSession {
  _id: Types.ObjectId;

  /* Ownership */
  identity: IdentityRef;
  provider: AuthProvider;

  /* Token security (hash only) */
  accessTokenHash: string;
  refreshTokenHash: string;
  lastRefreshTokenHash?: string;

  /* Device */
  device?: DeviceContext;
  ipAddress?: string;
  userAgent?: string;

  /* Lifecycle */
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  lastUsedAt?: Date;

  /* Security signals */
  revokedAt?: Date;
  revokedReason?: string;
  compromisedAt?: Date;

  /* Methods */
  isActive(): boolean;
  revoke(reason?: string): void;
  markCompromised(reason?: string): void;
}

/* -------------------------------------------------------------------------- */
/* MODEL STATICS                                                              */
/* -------------------------------------------------------------------------- */

export interface AuthSessionModelType
  extends Model<IAuthSession> {
  findValidByAccessHash(
    hash: string
  ): Promise<IAuthSession | null>;

  revokeAllForIdentity(
    identity: IdentityRef,
    reason?: string
  ): Promise<number>;
}

/* -------------------------------------------------------------------------- */
/* SUBSCHEMA — DEVICE                                                         */
/* -------------------------------------------------------------------------- */

const DeviceSchema = new Schema<DeviceContext>(
  {
    deviceId: { type: String, trim: true },
    deviceName: { type: String, trim: true },
    platform: {
      type: String,
      enum: ["WEB", "MOBILE", "API", "IOT"],
    },
    os: { type: String, trim: true },
    appVersion: { type: String, trim: true },
  },
  { _id: false, strict: true }
);

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const AuthSessionSchema = new Schema<IAuthSession>(
  {
    identity: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: Object.values(AuthProvider),
      required: true,
      index: true,
    },

    accessTokenHash: {
      type: String,
      required: true,
      minlength: 32,
      index: true,
      unique: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      minlength: 32,
      index: true,
      unique: true,
    },

    lastRefreshTokenHash: {
      type: String,
      index: true,
    },

    device: {
      type: DeviceSchema,
    },

    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },

    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.ACTIVE,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // ❌ NO index here (TTL index defined below)
    },

    lastUsedAt: {
      type: Date,
    },

    revokedAt: Date,
    revokedReason: { type: String, trim: true },
    compromisedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* TTL CLEANUP (SINGLE SOURCE OF TRUTH)                                       */
/* -------------------------------------------------------------------------- */

AuthSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

AuthSessionSchema.pre("save", function (next) {
  if (!this.accessTokenHash || !this.refreshTokenHash) {
    return next(
      new Error("Raw tokens must never be stored")
    );
  }

  if (this.expiresAt <= new Date()) {
    return next(
      new Error("expiresAt must be in the future")
    );
  }

  next();
});

AuthSessionSchema.pre(
  "deleteOne",
  { document: true },
  function (next) {
    return next(
      new Error(
        "Physical deletion forbidden. Use revocation."
      )
    );
  }
);

/* -------------------------------------------------------------------------- */
/* INSTANCE METHODS                                                           */
/* -------------------------------------------------------------------------- */

AuthSessionSchema.methods.isActive = function (): boolean {
  return (
    this.status === SessionStatus.ACTIVE &&
    this.expiresAt > new Date() &&
    !this.compromisedAt
  );
};

AuthSessionSchema.methods.revoke = function (
  reason?: string
): void {
  this.status = SessionStatus.REVOKED;
  this.revokedAt = new Date();
  this.revokedReason = reason;
};

AuthSessionSchema.methods.markCompromised = function (
  reason?: string
): void {
  this.status = SessionStatus.REVOKED;
  this.compromisedAt = new Date();
  this.revokedReason = reason;
};

/* -------------------------------------------------------------------------- */
/* STATIC HELPERS                                                             */
/* -------------------------------------------------------------------------- */

AuthSessionSchema.statics.findValidByAccessHash =
  async function (
    this: AuthSessionModelType,
    hash: string
  ) {
    return this.findOne({
      accessTokenHash: hash,
      status: SessionStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    }).exec();
  };

AuthSessionSchema.statics.revokeAllForIdentity =
  async function (
    this: AuthSessionModelType,
    identity: IdentityRef,
    reason?: string
  ) {
    const result = await this.updateMany(
      {
        identity,
        status: SessionStatus.ACTIVE,
      },
      {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      }
    ).exec();

    return result.modifiedCount ?? 0;
  };

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const AuthSessionModel =
  model<IAuthSession, AuthSessionModelType>(
    "AuthSession",
    AuthSessionSchema
  );
