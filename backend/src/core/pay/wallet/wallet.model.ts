/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — WALLET MODEL (BANKING CORE / OFFICIAL FINAL — LOCKED)     */
/*  File: backend/src/core/pay/wallet/wallet.model.ts                         */
/* -------------------------------------------------------------------------- */

import mongoose, {
  Schema,
  Model,
  HydratedDocument,
  CallbackWithoutResult,
} from "mongoose";

/* -------------------------------------------------------------------------- */
/* DOMAIN TYPES                                                               */
/* -------------------------------------------------------------------------- */

export enum WalletOwnerType {
  PERSON = "PERSON",
  ORGANIZATION = "ORGANIZATION",
}

export enum WalletStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  FROZEN = "FROZEN",
  CLOSED = "CLOSED",
}

export type CurrencyCode =
  | "USD"
  | "EUR"
  | "CDF"
  | "XAF"
  | "XOF"
  | "KES"
  | "NGN"
  | "ZAR"
  | "GHS"
  | "UGX"
  | "RWF"
  | "TZS"
  | "MAD"
  | "EGP";

export enum WalletRiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/* -------------------------------------------------------------------------- */
/* SUB-DOCUMENTS                                                              */
/* -------------------------------------------------------------------------- */

export interface WalletBalance {
  currency: CurrencyCode;
  available: number;
  locked: number;
  pending: number;
  checksum?: string;
  updatedAt: Date;
}

export interface WalletLimits {
  dailyIn?: number;
  dailyOut?: number;
  monthlyIn?: number;
  monthlyOut?: number;
  maxBalance?: number;
  maxSingleTx?: number;
}

export interface WalletSecurity {
  frozenReason?: string;
  frozenAt?: Date;
  frozenBy?: "SYSTEM" | "ADMIN" | "AI";
  reviewRequired?: boolean;
  lastRiskEvaluationAt?: Date;
}

export interface WalletMeta {
  trustScoreAtCreation: number;
  verificationLevelAtCreation: number;
  createdFrom: "SYSTEM" | "MIGRATION" | "IMPORT";
  tags?: string[];
  region?: string;
}

export interface WalletDocument {
  ownerType: WalletOwnerType;
  ownerId: mongoose.Types.ObjectId;

  status: WalletStatus;
  riskLevel: WalletRiskLevel;

  balances: WalletBalance[];

  limits?: WalletLimits;
  security?: WalletSecurity;
  meta: WalletMeta;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* HYDRATED TYPE                                                              */
/* -------------------------------------------------------------------------- */

export type WalletHydratedDocument =
  HydratedDocument<WalletDocument>;

/* -------------------------------------------------------------------------- */
/* MODEL STATICS TYPES                                                        */
/* -------------------------------------------------------------------------- */

export interface WalletModelStatics {
  findByOwner(
    ownerType: WalletOwnerType,
    ownerId: mongoose.Types.ObjectId
  ): Promise<WalletHydratedDocument | null>;

  findActiveByOwner(
    ownerType: WalletOwnerType,
    ownerId: mongoose.Types.ObjectId
  ): Promise<WalletHydratedDocument | null>;
}

/* -------------------------------------------------------------------------- */
/* SCHEMAS                                                                    */
/* -------------------------------------------------------------------------- */

const WalletBalanceSchema = new Schema<WalletBalance>(
  {
    currency: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    available: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    locked: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    pending: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    checksum: {
      type: String,
      index: true,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const WalletLimitsSchema = new Schema<WalletLimits>(
  {
    dailyIn: { type: Number, min: 0 },
    dailyOut: { type: Number, min: 0 },
    monthlyIn: { type: Number, min: 0 },
    monthlyOut: { type: Number, min: 0 },
    maxBalance: { type: Number, min: 0 },
    maxSingleTx: { type: Number, min: 0 },
  },
  { _id: false }
);

const WalletSecuritySchema = new Schema<WalletSecurity>(
  {
    frozenReason: String,
    frozenAt: Date,
    frozenBy: {
      type: String,
      enum: ["SYSTEM", "ADMIN", "AI"],
    },
    reviewRequired: Boolean,
    lastRiskEvaluationAt: Date,
  },
  { _id: false }
);

const WalletMetaSchema = new Schema<WalletMeta>(
  {
    trustScoreAtCreation: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    verificationLevelAtCreation: {
      type: Number,
      required: true,
      min: 0,
    },
    createdFrom: {
      type: String,
      enum: ["SYSTEM", "MIGRATION", "IMPORT"],
      required: true,
    },
    tags: [{ type: String, trim: true }],
    region: {
      type: String,
      index: true,
    },
  },
  { _id: false }
);

const WalletSchema = new Schema<
  WalletDocument,
  Model<WalletDocument> & WalletModelStatics
>(
  {
    ownerType: {
      type: String,
      enum: Object.values(WalletOwnerType),
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(WalletStatus),
      required: true,
      default: WalletStatus.ACTIVE,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: Object.values(WalletRiskLevel),
      default: WalletRiskLevel.LOW,
      index: true,
    },
    balances: {
      type: [WalletBalanceSchema],
      required: true,
      default: [],
    },
    limits: WalletLimitsSchema,
    security: WalletSecuritySchema,
    meta: {
      type: WalletMetaSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

WalletSchema.index(
  { ownerType: 1, ownerId: 1 },
  { unique: true }
);
WalletSchema.index({ status: 1 });
WalletSchema.index({ riskLevel: 1 });
WalletSchema.index({ "balances.currency": 1 });
WalletSchema.index({ "meta.region": 1 });

/* -------------------------------------------------------------------------- */
/* INTEGRITY GUARDS                                                           */
/* -------------------------------------------------------------------------- */

WalletSchema.pre(
  "save",
  function (
    this: WalletHydratedDocument,
    next: CallbackWithoutResult
  ) {
    for (const balance of this.balances ?? []) {
      if (
        balance.available < 0 ||
        balance.locked < 0 ||
        balance.pending < 0
      ) {
        return next(
          new Error("Wallet balance cannot be negative")
        );
      }
    }

    if (
      this.status === WalletStatus.CLOSED &&
      this.balances.some(
        (b) =>
          b.available > 0 ||
          b.locked > 0 ||
          b.pending > 0
      )
    ) {
      return next(
        new Error(
          "Wallet cannot be CLOSED with remaining balance"
        )
      );
    }

    next(); // ✅ Correct typing
  }
);

/**
 * Interdiction stricte de suppression physique.
 * Typage compatible mongoose v7+.
 */
WalletSchema.pre(
  ["deleteOne", "deleteMany", "findOneAndDelete"],
  { document: true }, // ✅ document middleware only
  function (
    _doc: WalletHydratedDocument,
    next: CallbackWithoutResult
  ) {
    return next(
      new Error("Physical deletion of wallets is forbidden")
    );
  }
);

/* -------------------------------------------------------------------------- */
/* SAFE STATICS                                                               */
/* -------------------------------------------------------------------------- */

WalletSchema.statics.findByOwner = function (
  ownerType: WalletOwnerType,
  ownerId: mongoose.Types.ObjectId
) {
  return this.findOne({ ownerType, ownerId });
};

WalletSchema.statics.findActiveByOwner = function (
  ownerType: WalletOwnerType,
  ownerId: mongoose.Types.ObjectId
) {
  return this.findOne({
    ownerType,
    ownerId,
    status: WalletStatus.ACTIVE,
  });
};

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const WalletModel = (mongoose.models
  .Wallet ??
  mongoose.model<
    WalletDocument,
    Model<WalletDocument> & WalletModelStatics
  >("Wallet", WalletSchema)) as Model<
  WalletDocument
> &
  WalletModelStatics;
