/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — TRANSACTION LEDGER MODEL (OFFICIAL FINAL — LOCKED)        */
/*  File: backend/src/core/pay/transaction/transaction.model.ts               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MANIFESTE :                                                               */
/*  - Une transaction est un FAIT IMMUTABLE                                   */
/*  - Elle ne se modifie jamais, ne se supprime jamais                         */
/*  - Toute correction = nouvelle transaction                                 */
/*  - Traçable juridiquement, comptablement, algorithmiquement                */
/*  - Compatible régulation mondiale                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, {
  Schema,
  Model,
  HydratedDocument,
  CallbackWithoutResult,
} from "mongoose";
import crypto from "crypto";

import {
  TransactionDirection,
  TransactionNature,
  TransactionStatus,
} from "./transaction.types";

/* -------------------------------------------------------------------------- */
/* RUNTIME ENUM VALUES (TS SAFE)                                               */
/* -------------------------------------------------------------------------- */
/**
 * ⚠️ IMPORTANT
 * On utilise explicitement les enums runtime.
 * Object.values(enum) est instable selon compilation TS / bundler.
 */

const TRANSACTION_DIRECTIONS: readonly TransactionDirection[] = [
  TransactionDirection.IN,
  TransactionDirection.OUT,
  TransactionDirection.INTERNAL,
  TransactionDirection.SYSTEM,
];

const TRANSACTION_NATURES: readonly TransactionNature[] = [
  TransactionNature.PAYMENT,
  TransactionNature.PAYOUT,
  TransactionNature.REFUND,

  TransactionNature.ESCROW_LOCK,
  TransactionNature.ESCROW_RELEASE,
  TransactionNature.ESCROW_REFUND,

  TransactionNature.FEE,
  TransactionNature.TAX,
  TransactionNature.BONUS,
  TransactionNature.ADJUSTMENT,

  TransactionNature.REVERSAL,
  TransactionNature.SETTLEMENT,

  TransactionNature.TOPUP,
  TransactionNature.WITHDRAW,
  TransactionNature.OFFLINE_SYNC,
];

const TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  TransactionStatus.PENDING,
  TransactionStatus.PROCESSING,
  TransactionStatus.COMPLETED,
  TransactionStatus.FAILED,
  TransactionStatus.CANCELLED,
  TransactionStatus.REVERSED,
  TransactionStatus.EXPIRED,
];

/* -------------------------------------------------------------------------- */
/* CORE TYPES                                                                 */
/* -------------------------------------------------------------------------- */

export interface TransactionReference {
  module: string;
  entityId?: string;
  action?: string;
  correlationId?: string;
}

export interface TransactionParty {
  walletId?: mongoose.Types.ObjectId;
  ownerType?: "PERSON" | "ORGANIZATION" | "SYSTEM";
  ownerId?: mongoose.Types.ObjectId;
  label?: string;
}

export interface TransactionAmounts {
  currency: string;
  grossAmount: number;
  feeAmount?: number;
  taxAmount?: number;
  netAmount: number;
  exchangeRate?: number;
  originalCurrency?: string;
  originalAmount?: number;
}

export interface TransactionLeg {
  legId: string;
  from?: TransactionParty;
  to?: TransactionParty;
  amounts: TransactionAmounts;
}

export interface TransactionRisk {
  score?: number;
  flags?: string[];
  screenedAt?: Date;
}

export interface TransactionMeta {
  initiatedBy: "USER" | "SYSTEM" | "ADMIN" | "AI";
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  geo?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  trustScoreAtExecution?: number;
  notes?: string;
  tags?: string[];
}

export interface TransactionAudit {
  immutableHash: string;
  previousHash?: string;
  signature?: string;
}

export interface TransactionDocument {
  reference: string;
  sequence: number;

  direction: TransactionDirection;
  nature: TransactionNature;
  status: TransactionStatus;

  legs: TransactionLeg[];

  referenceContext: TransactionReference;

  risk?: TransactionRisk;
  meta?: TransactionMeta;

  audit: TransactionAudit;

  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  expiredAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* HYDRATED TYPE                                                              */
/* -------------------------------------------------------------------------- */

export type TransactionHydratedDocument =
  HydratedDocument<TransactionDocument>;

/* -------------------------------------------------------------------------- */
/* SUB SCHEMAS                                                                */
/* -------------------------------------------------------------------------- */

const TransactionPartySchema = new Schema<TransactionParty>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    ownerType: {
      type: String,
      enum: ["PERSON", "ORGANIZATION", "SYSTEM"],
    },
    ownerId: { type: Schema.Types.ObjectId },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const TransactionAmountsSchema = new Schema<TransactionAmounts>(
  {
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    feeAmount: { type: Number, min: 0 },
    taxAmount: { type: Number, min: 0 },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    exchangeRate: { type: Number, min: 0 },
    originalCurrency: { type: String },
    originalAmount: { type: Number, min: 0 },
  },
  { _id: false }
);

const TransactionLegSchema = new Schema<TransactionLeg>(
  {
    legId: { type: String, required: true },
    from: { type: TransactionPartySchema },
    to: { type: TransactionPartySchema },
    amounts: {
      type: TransactionAmountsSchema,
      required: true,
    },
  },
  { _id: false }
);

const TransactionReferenceSchema = new Schema<TransactionReference>(
  {
    module: {
      type: String,
      required: true,
      index: true,
    },
    entityId: { type: String, index: true },
    action: { type: String },
    correlationId: {
      type: String,
      index: true,
    },
  },
  { _id: false }
);

const TransactionRiskSchema = new Schema<TransactionRisk>(
  {
    score: {
      type: Number,
      min: 0,
      max: 100,
      index: true,
    },
    flags: [{ type: String, index: true }],
    screenedAt: { type: Date },
  },
  { _id: false }
);

const TransactionMetaSchema = new Schema<TransactionMeta>(
  {
    initiatedBy: {
      type: String,
      enum: ["USER", "SYSTEM", "ADMIN", "AI"],
      required: true,
      index: true,
    },
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    geo: {
      country: String,
      city: String,
      lat: Number,
      lng: Number,
    },
    trustScoreAtExecution: {
      type: Number,
      min: 0,
      max: 100,
    },
    notes: String,
    tags: [{ type: String, index: true }],
  },
  { _id: false }
);

const TransactionAuditSchema = new Schema<TransactionAudit>(
  {
    immutableHash: {
      type: String,
      required: true,
      index: true,
    },
    previousHash: { type: String, index: true },
    signature: { type: String },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* MAIN SCHEMA                                                                */
/* -------------------------------------------------------------------------- */

const TransactionSchema = new Schema<
  TransactionDocument,
  Model<TransactionDocument>
>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    sequence: {
      type: Number,
      required: true,
      index: true,
    },

    direction: {
      type: String,
      enum: TRANSACTION_DIRECTIONS,
      required: true,
      index: true,
    },

    nature: {
      type: String,
      enum: TRANSACTION_NATURES,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      required: true,
      index: true,
    },

    legs: {
      type: [TransactionLegSchema],
      required: true,
      validate: {
        validator: (v: TransactionLeg[]) =>
          Array.isArray(v) && v.length > 0,
        message: "Transaction must contain at least one leg",
      },
    },

    referenceContext: {
      type: TransactionReferenceSchema,
      required: true,
    },

    risk: TransactionRiskSchema,
    meta: TransactionMetaSchema,

    audit: {
      type: TransactionAuditSchema,
      required: true,
    },

    processedAt: Date,
    completedAt: Date,
    expiredAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ sequence: -1 });
TransactionSchema.index({ status: 1, nature: 1 });
TransactionSchema.index({ "legs.from.walletId": 1 });
TransactionSchema.index({ "legs.to.walletId": 1 });
TransactionSchema.index({ "referenceContext.module": 1 });
TransactionSchema.index({ "meta.tags": 1 });
TransactionSchema.index({ "risk.score": -1 });

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY GUARDS                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Compute immutable hash once at creation.
 */
TransactionSchema.pre(
  "save",
  function (
    this: TransactionHydratedDocument,
    next: CallbackWithoutResult
  ) {
    if (!this.audit?.immutableHash) {
      const payload = JSON.stringify({
        reference: this.reference,
        sequence: this.sequence,
        direction: this.direction,
        nature: this.nature,
        legs: this.legs,
        createdAt: this.createdAt,
      });

      this.audit.immutableHash = crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");
    }

    // ✅ Mongoose typing expects null (not undefined)
    next(null);
  }
);

/**
 * Block any mutation after creation.
 */
TransactionSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function () {
    throw new Error(
      "Transactions are immutable and cannot be modified."
    );
  }
);

/**
 * Block any physical deletion.
 * ✅ Mongoose v8 typing requires { document: true, query: true }
 */
TransactionSchema.pre(
  ["deleteOne", "deleteMany", "findOneAndDelete"],
  { document: true, query: true },
  function () {
    throw new Error("Transactions cannot be deleted.");
  }
);

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const TransactionModel = (mongoose.models
  .Transaction ??
  mongoose.model<TransactionDocument>(
    "Transaction",
    TransactionSchema
  )) as Model<TransactionDocument>;
