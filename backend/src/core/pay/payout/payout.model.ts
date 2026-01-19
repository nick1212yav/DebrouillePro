/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — PAYOUT MODEL (WORLD CLASS LEDGER ENGINE)                  */
/*  File: backend/src/core/pay/payout.model.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  PRINCIPES CONSTITUTIONNELS                                                 */
/*  - Un payout est une sortie IRRÉVERSIBLE d’argent                            */
/*  - Toujours initié depuis un wallet valide                                  */
/*  - Toujours soumis aux règles Trust, Access, Risk, AML                      */
/*  - Toujours traçable, explicable, auditable                                 */
/*  - Jamais exécuté directement par un module métier                          */
/*  - Toujours idempotent                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, {
  Schema,
  Document,
  Model,
  ClientSession,
} from "mongoose";

/* -------------------------------------------------------------------------- */
/* ENUMS                                                                      */
/* -------------------------------------------------------------------------- */

export enum PayoutStatus {
  REQUESTED = "REQUESTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  FLAGGED = "FLAGGED",
}

export enum PayoutMethod {
  BANK_TRANSFER = "BANK_TRANSFER",
  MOBILE_MONEY = "MOBILE_MONEY",
  CASH = "CASH",
  CRYPTO = "CRYPTO",
  CARD = "CARD",
  AGENT = "AGENT",
  OTHER = "OTHER",
}

/**
 * États terminaux (immutables).
 */
export const FINAL_PAYOUT_STATUSES: readonly PayoutStatus[] =
  [
    PayoutStatus.COMPLETED,
    PayoutStatus.CANCELLED,
    PayoutStatus.REJECTED,
    PayoutStatus.FAILED,
    PayoutStatus.EXPIRED,
  ] as const;

/* -------------------------------------------------------------------------- */
/* DESTINATION                                                                */
/* -------------------------------------------------------------------------- */

export interface PayoutDestination {
  method: PayoutMethod;
  label?: string;

  /* BANK */
  bankName?: string;
  bankCode?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swift?: string;

  /* MOBILE MONEY */
  mobileProvider?: string; // Orange, Airtel, Vodacom, MTN, Moov...
  mobileNumber?: string;
  mobileCountryCode?: string;

  /* CRYPTO */
  cryptoNetwork?: string;
  cryptoAddress?: string;
  cryptoMemo?: string;

  /* CASH / AGENT */
  pickupCity?: string;
  pickupAgentId?: string;

  /* GEO */
  countryCode?: string;
  region?: string;
}

export interface PayoutRiskSnapshot {
  trustScore: number;
  verificationLevel: number;
  velocityScore?: number;
  geoRiskScore?: number;
  amlRiskScore?: number;
  fraudSignals?: string[];
}

/* -------------------------------------------------------------------------- */
/* META                                                                       */
/* -------------------------------------------------------------------------- */

export interface PayoutMeta {
  initiatedBy: "USER" | "SYSTEM" | "ADMIN" | "AI";
  idempotencyKey: string;

  riskSnapshot: PayoutRiskSnapshot;

  ipAddress?: string;
  userAgent?: string;

  module?: string;
  entityId?: string;

  notes?: string;
  tags?: string[];
}

/* -------------------------------------------------------------------------- */
/* PAYOUT DOCUMENT                                                            */
/* -------------------------------------------------------------------------- */

export interface PayoutDocument extends Document {
  /* Identity */
  walletId: mongoose.Types.ObjectId;
  ownerType: "PERSON" | "ORGANIZATION";
  ownerId: mongoose.Types.ObjectId;

  /* Money */
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;

  /* Status */
  status: PayoutStatus;
  failureReason?: string;
  rejectionReason?: string;

  /* Destination */
  destination: PayoutDestination;

  /* Ledger */
  relatedTransactionId?: mongoose.Types.ObjectId;
  providerReference?: string;

  /* Meta */
  meta: PayoutMeta;

  /* Lifecycle */
  requestedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;

  /* Methods */
  isFinal(): boolean;
  canTransitionTo(next: PayoutStatus): boolean;
}

/* -------------------------------------------------------------------------- */
/* SCHEMAS                                                                    */
/* -------------------------------------------------------------------------- */

const PayoutDestinationSchema =
  new Schema<PayoutDestination>(
    {
      method: {
        type: String,
        enum: Object.values(PayoutMethod),
        required: true,
        index: true,
      },

      label: String,

      bankName: String,
      bankCode: String,
      accountName: String,
      accountNumber: String,
      iban: String,
      swift: String,

      mobileProvider: { type: String, index: true },
      mobileNumber: String,
      mobileCountryCode: String,

      cryptoNetwork: String,
      cryptoAddress: String,
      cryptoMemo: String,

      pickupCity: String,
      pickupAgentId: String,

      countryCode: { type: String, uppercase: true },
      region: String,
    },
    { _id: false }
  );

const PayoutRiskSchema =
  new Schema<PayoutRiskSnapshot>(
    {
      trustScore: { type: Number, required: true },
      verificationLevel: { type: Number, required: true },
      velocityScore: Number,
      geoRiskScore: Number,
      amlRiskScore: Number,
      fraudSignals: [String],
    },
    { _id: false }
  );

const PayoutMetaSchema = new Schema<PayoutMeta>(
  {
    initiatedBy: {
      type: String,
      enum: ["USER", "SYSTEM", "ADMIN", "AI"],
      required: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },

    riskSnapshot: {
      type: PayoutRiskSchema,
      required: true,
    },

    ipAddress: String,
    userAgent: String,

    module: String,
    entityId: String,

    notes: String,
    tags: [String],
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* MAIN SCHEMA                                                                */
/* -------------------------------------------------------------------------- */

const PayoutSchema = new Schema<PayoutDocument>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    ownerType: {
      type: String,
      enum: ["PERSON", "ORGANIZATION"],
      required: true,
      index: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },

    fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(PayoutStatus),
      required: true,
      default: PayoutStatus.REQUESTED,
      index: true,
    },

    failureReason: String,
    rejectionReason: String,

    destination: {
      type: PayoutDestinationSchema,
      required: true,
    },

    relatedTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      index: true,
    },

    providerReference: {
      type: String,
      index: true,
    },

    meta: {
      type: PayoutMetaSchema,
      required: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    reviewedAt: Date,
    approvedAt: Date,
    processedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    expiredAt: Date,
  },
  {
    timestamps: false,
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

// Idempotence globale
PayoutSchema.index(
  { "meta.idempotencyKey": 1 },
  { unique: true }
);

// Historique par wallet
PayoutSchema.index({ walletId: 1, requestedAt: -1 });

// Filtrage opérationnel
PayoutSchema.index({ status: 1, "destination.method": 1 });

// Recherche provider
PayoutSchema.index({ providerReference: 1 });

/* -------------------------------------------------------------------------- */
/* STATE MACHINE                                                              */
/* -------------------------------------------------------------------------- */

const STATE_GRAPH: Record<
  PayoutStatus,
  readonly PayoutStatus[]
> = {
  REQUESTED: [
    PayoutStatus.UNDER_REVIEW,
    PayoutStatus.CANCELLED,
    PayoutStatus.FLAGGED,
  ],

  UNDER_REVIEW: [
    PayoutStatus.APPROVED,
    PayoutStatus.REJECTED,
    PayoutStatus.FLAGGED,
  ],

  APPROVED: [
    PayoutStatus.PROCESSING,
    PayoutStatus.CANCELLED,
  ],

  PROCESSING: [
    PayoutStatus.COMPLETED,
    PayoutStatus.FAILED,
  ],

  FLAGGED: [
    PayoutStatus.UNDER_REVIEW,
    PayoutStatus.REJECTED,
  ],

  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  FAILED: [],
  EXPIRED: [],
};

PayoutSchema.methods.isFinal = function (): boolean {
  return FINAL_PAYOUT_STATUSES.includes(this.status);
};

PayoutSchema.methods.canTransitionTo =
  function (next: PayoutStatus): boolean {
    if (this.isFinal()) return false;
    return STATE_GRAPH[this.status]?.includes(next);
  };

/* -------------------------------------------------------------------------- */
/* SAFETY GUARDS                                                              */
/* -------------------------------------------------------------------------- */

PayoutSchema.pre("save", function (next) {
  if (this.netAmount > this.amount) {
    return next(
      new Error("Net amount cannot exceed amount")
    );
  }

  if (!this.meta?.idempotencyKey) {
    return next(
      new Error("Idempotency key is mandatory")
    );
  }

  next();
});

PayoutSchema.pre("remove", function (next) {
  return next(
    new Error("Physical deletion of payouts is forbidden")
  );
});

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const PayoutModel: Model<PayoutDocument> =
  mongoose.models.Payout ||
  mongoose.model<PayoutDocument>("Payout", PayoutSchema);
