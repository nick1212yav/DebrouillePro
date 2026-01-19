/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE IDENTITY — ORGANIZATION MEMBER MODEL (WORLD #1 GOVERNANCE)     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/identity/organizationMember.model.ts               */
/* -------------------------------------------------------------------------- */

import { Schema, model, Document, Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* ENUMS — GOUVERNANCE                                                        */
/* -------------------------------------------------------------------------- */

export enum OrganizationRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  MEMBER = "MEMBER",
  AUDITOR = "AUDITOR",
  AUTOMATION = "AUTOMATION",
}

export enum MembershipStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
}

/* -------------------------------------------------------------------------- */
/* INTERFACE CANONIQUE                                                        */
/* -------------------------------------------------------------------------- */

export interface IOrganizationMember extends Document {
  _id: Types.ObjectId;

  organizationId: Types.ObjectId;
  userId: Types.ObjectId;

  role: OrganizationRole;
  permissionsOverride?: string[];
  delegationLevel?: number;

  status: MembershipStatus;
  joinedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  grantedBy?: Types.ObjectId;

  lastAccessAt?: Date;
  suspiciousFlags?: string[];

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
  {
    /* ----------------------------- RELATIONS ---------------------------- */

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ----------------------------- GOVERNANCE --------------------------- */

    role: {
      type: String,
      enum: Object.values(OrganizationRole),
      required: true,
    },

    permissionsOverride: {
      type: [String],
      default: undefined,
    },

    delegationLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },

    /* ----------------------------- LIFECYCLE ---------------------------- */

    status: {
      type: String,
      enum: Object.values(MembershipStatus),
      default: MembershipStatus.PENDING,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },

    expiresAt: {
      type: Date,
    },

    revokedAt: {
      type: Date,
    },

    revokedReason: {
      type: String,
      trim: true,
    },

    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    /* ----------------------------- SECURITY ----------------------------- */

    lastAccessAt: {
      type: Date,
    },

    suspiciousFlags: {
      type: [String],
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES — SINGLE SOURCE OF TRUTH                                           */
/* -------------------------------------------------------------------------- */

/**
 * Un USER ne peut avoir qu’une relation ACTIVE par organisation.
 */
OrganizationMemberSchema.index(
  { organizationId: 1, userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: MembershipStatus.ACTIVE,
    },
  }
);

/**
 * Gouvernance & requêtes rapides.
 */
OrganizationMemberSchema.index({ organizationId: 1, role: 1 });
OrganizationMemberSchema.index({ userId: 1, status: 1 });
OrganizationMemberSchema.index({ expiresAt: 1 });
OrganizationMemberSchema.index({ grantedBy: 1 });
OrganizationMemberSchema.index({ status: 1, joinedAt: -1 });

/* -------------------------------------------------------------------------- */
/* GUARANTEES — HARD RULES                                                    */
/* -------------------------------------------------------------------------- */

OrganizationMemberSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === MembershipStatus.REVOKED &&
    this.role === OrganizationRole.OWNER
  ) {
    return next(
      new Error(
        "OWNER cannot be revoked directly. Ownership transfer is mandatory."
      )
    );
  }

  if (this.expiresAt && this.expiresAt <= new Date()) {
    return next(
      new Error("expiresAt must be in the future")
    );
  }

  if (
    this.delegationLevel !== undefined &&
    (this.delegationLevel < 0 ||
      this.delegationLevel > 100)
  ) {
    return next(
      new Error("delegationLevel must be between 0 and 100")
    );
  }

  next();
});

/**
 * Suppression physique strictement interdite.
 */
OrganizationMemberSchema.pre(
  "deleteOne",
  { document: true },
  function (next) {
    return next(
      new Error(
        "Physical deletion of OrganizationMember is forbidden. Use lifecycle fields."
      )
    );
  }
);

/* -------------------------------------------------------------------------- */
/* DOMAIN METHODS                                                            */
/* -------------------------------------------------------------------------- */

OrganizationMemberSchema.methods.isActive = function (): boolean {
  if (this.status !== MembershipStatus.ACTIVE) return false;
  if (this.expiresAt && this.expiresAt <= new Date()) return false;
  return true;
};

OrganizationMemberSchema.methods.suspend = function (
  reason?: string
): void {
  this.status = MembershipStatus.SUSPENDED;
  this.revokedReason = reason;
};

OrganizationMemberSchema.methods.revoke = function (
  reason?: string
): void {
  this.status = MembershipStatus.REVOKED;
  this.revokedAt = new Date();
  this.revokedReason = reason;
};

OrganizationMemberSchema.methods.flagSuspicious = function (
  flag: string
): void {
  this.suspiciousFlags = Array.from(
    new Set([...(this.suspiciousFlags ?? []), flag])
  );
};

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const OrganizationMemberModel = model<IOrganizationMember>(
  "OrganizationMember",
  OrganizationMemberSchema
);
