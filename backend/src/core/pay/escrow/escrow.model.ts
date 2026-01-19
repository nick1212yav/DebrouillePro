/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — ESCROW MODEL (ULTRA CANONICAL FINAL)                      */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/escrow/escrow.model.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  PRINCIPES ABSOLUS                                                         */
/*  - Les fonds en escrow n'appartiennent à PERSONNE                          */
/*  - Jamais modifiables sans transition contrôlée                            */
/*  - Toujours traçables juridiquement                                       */
/*  - Compatibles arbitrage humain / IA / justice                             */
/*  - Aucune suppression physique                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, {
  Schema,
  Document,
  Model,
  Types,
} from "mongoose";

/* -------------------------------------------------------------------------- */
/* ENUMS (STRICT)                                                             */
/* -------------------------------------------------------------------------- */

export enum EscrowStatus {
  LOCKED = "LOCKED",
  PARTIALLY_RELEASED = "PARTIALLY_RELEASED",
  RELEASED = "RELEASED",
  REFUNDED = "REFUNDED",
  DISPUTED = "DISPUTED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum EscrowReleaseTrigger {
  MANUAL = "MANUAL",
  AUTO_TIME = "AUTO_TIME",
  MODULE_EVENT = "MODULE_EVENT",
  DISPUTE_RESOLUTION = "DISPUTE_RESOLUTION",
  AI_DECISION = "AI_DECISION",
  COURT_ORDER = "COURT_ORDER",
}

export enum EscrowOwnerType {
  PERSON = "PERSON",
  ORGANIZATION = "ORGANIZATION",
}

export enum EscrowRiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/* -------------------------------------------------------------------------- */
/* SUB TYPES                                                                  */
/* -------------------------------------------------------------------------- */

export interface EscrowParty {
  walletId: Types.ObjectId;
  ownerType: EscrowOwnerType;
  ownerId: Types.ObjectId;
}

export interface EscrowRules {
  autoReleaseAfterDays?: number;
  allowPartialRelease?: boolean;
  requiresConfirmation?: boolean;
  allowDispute?: boolean;
  maxHoldingDays?: number;
}

export interface EscrowCompliance {
  amlChecked: boolean;
  kycChecked: boolean;
  sanctionsChecked: boolean;
  jurisdiction?: string;
  complianceNotes?: string;
}

export interface EscrowMeta {
  createdBy: "SYSTEM" | "MODULE" | "ADMIN";
  module: string;
  entityId?: string;

  trustScoreAtCreation: number;
  riskLevel: EscrowRiskLevel;

  ipAddress?: string;
  userAgent?: string;

  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* MAIN DOCUMENT                                                              */
/* -------------------------------------------------------------------------- */

export interface EscrowDocument extends Document {
  _id: Types.ObjectId;

  /* Financial */
  amount: number;
  currency: string;
  releasedAmount: number;

  /* State */
  status: EscrowStatus;
  releaseTrigger?: EscrowReleaseTrigger;

  /* Parties */
  from: EscrowParty;
  to: EscrowParty;

  /* Rules */
  rules?: EscrowRules;

  /* Compliance */
  compliance?: EscrowCompliance;

  /* Links */
  relatedTransactionId: Types.ObjectId;
  disputeId?: Types.ObjectId;

  /* Metadata */
  meta: EscrowMeta;

  /* Timeline */
  lockedAt: Date;
  lastActionAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  disputedAt?: Date;
  resolvedAt?: Date;
  expiredAt?: Date;
  cancelledAt?: Date;

  /* Guards */
  isActive(): boolean;
  canRelease(amount?: number): boolean;
  markReleased(
    trigger: EscrowReleaseTrigger,
    amount?: number
  ): void;
  markDisputed(reason?: string): void;
  markExpired(): void;
}

/* -------------------------------------------------------------------------- */
/* SUBSCHEMAS                                                                 */
/* -------------------------------------------------------------------------- */

const EscrowPartySchema = new Schema<EscrowParty>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      immutable: true,
    },
    ownerType: {
      type: String,
      enum: Object.values(EscrowOwnerType),
      required: true,
      immutable: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
  },
  { _id: false, strict: true }
);

const EscrowRulesSchema = new Schema<EscrowRules>(
  {
    autoReleaseAfterDays: { type: Number, min: 0 },
    allowPartialRelease: { type: Boolean, default: false },
    requiresConfirmation: { type: Boolean, default: true },
    allowDispute: { type: Boolean, default: true },
    maxHoldingDays: { type: Number, min: 1 },
  },
  { _id: false, strict: true }
);

const EscrowComplianceSchema = new Schema<EscrowCompliance>(
  {
    amlChecked: { type: Boolean, default: false },
    kycChecked: { type: Boolean, default: false },
    sanctionsChecked: { type: Boolean, default: false },
    jurisdiction: { type: String, trim: true },
    complianceNotes: { type: String, trim: true },
  },
  { _id: false, strict: true }
);

const EscrowMetaSchema = new Schema<EscrowMeta>(
  {
    createdBy: {
      type: String,
      enum: ["SYSTEM", "MODULE", "ADMIN"],
      required: true,
      immutable: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
      immutable: true,
    },
    entityId: { type: String, trim: true },
    trustScoreAtCreation: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      immutable: true,
    },
    riskLevel: {
      type: String,
      enum: Object.values(EscrowRiskLevel),
      default: EscrowRiskLevel.MEDIUM,
      index: true,
    },
    ipAddress: String,
    userAgent: String,
    notes: { type: String, trim: true },
  },
  { _id: false, strict: true }
);

/* -------------------------------------------------------------------------- */
/* MAIN SCHEMA                                                                */
/* -------------------------------------------------------------------------- */

const EscrowSchema = new Schema<EscrowDocument>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      immutable: true,
    },

    releasedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
      immutable: true,
    },

    status: {
      type: String,
      enum: Object.values(EscrowStatus),
      default: EscrowStatus.LOCKED,
      index: true,
    },

    releaseTrigger: {
      type: String,
      enum: Object.values(EscrowReleaseTrigger),
      index: true,
    },

    from: { type: EscrowPartySchema, required: true },
    to: { type: EscrowPartySchema, required: true },

    rules: EscrowRulesSchema,
    compliance: EscrowComplianceSchema,

    relatedTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      index: true,
      immutable: true,
    },

    disputeId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    meta: {
      type: EscrowMetaSchema,
      required: true,
    },

    lockedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },

    lastActionAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    disputedAt: Date,
    resolvedAt: Date,
    expiredAt: Date,
    cancelledAt: Date,
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

EscrowSchema.index({ status: 1, currency: 1 });
EscrowSchema.index({ "meta.module": 1, lockedAt: -1 });
EscrowSchema.index({ relatedTransactionId: 1 }, { unique: true });
EscrowSchema.index({ disputeId: 1 });
EscrowSchema.index({ "meta.riskLevel": 1 });

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

EscrowSchema.pre("save", function (next) {
  if (this.releasedAmount > this.amount) {
    return next(
      new Error("releasedAmount cannot exceed escrow amount")
    );
  }

  if (
    this.status === EscrowStatus.RELEASED &&
    this.releasedAmount !== this.amount
  ) {
    return next(
      new Error("RELEASED escrow must release full amount")
    );
  }

  next();
});

EscrowSchema.pre("remove", function (next) {
  return next(
    new Error("Physical deletion of Escrow is forbidden")
  );
});

/* -------------------------------------------------------------------------- */
/* METHODS                                                                    */
/* -------------------------------------------------------------------------- */

EscrowSchema.methods.isActive = function (): boolean {
  return [
    EscrowStatus.LOCKED,
    EscrowStatus.PARTIALLY_RELEASED,
    EscrowStatus.DISPUTED,
  ].includes(this.status);
};

EscrowSchema.methods.canRelease = function (
  amount?: number
): boolean {
  if (!this.isActive()) return false;

  const remaining =
    this.amount - this.releasedAmount;

  if (amount && amount > remaining) return false;

  return true;
};

EscrowSchema.methods.markReleased = function (
  trigger: EscrowReleaseTrigger,
  amount?: number
): void {
  const releaseAmount =
    amount ?? this.amount - this.releasedAmount;

  if (!this.canRelease(releaseAmount)) {
    throw new Error("Escrow cannot be released");
  }

  this.releasedAmount += releaseAmount;
  this.releaseTrigger = trigger;
  this.lastActionAt = new Date();

  if (this.releasedAmount >= this.amount) {
    this.status = EscrowStatus.RELEASED;
    this.releasedAt = new Date();
  } else {
    this.status = EscrowStatus.PARTIALLY_RELEASED;
  }
};

EscrowSchema.methods.markDisputed = function (
  reason?: string
): void {
  if (!this.isActive()) {
    throw new Error("Escrow cannot be disputed");
  }

  this.status = EscrowStatus.DISPUTED;
  this.disputedAt = new Date();
  this.lastActionAt = new Date();

  if (reason) {
    this.meta.notes = reason;
  }
};

EscrowSchema.methods.markExpired = function (): void {
  if (this.status !== EscrowStatus.LOCKED) return;

  this.status = EscrowStatus.EXPIRED;
  this.expiredAt = new Date();
  this.lastActionAt = new Date();
};

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const EscrowModel: Model<EscrowDocument> =
  mongoose.models.Escrow ||
  mongoose.model<EscrowDocument>("Escrow", EscrowSchema);
