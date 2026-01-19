/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — INVOICE MODEL (ULTRA OFFICIAL FINAL)                      */
/*  File: backend/src/core/pay/invoice.model.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES                                                  */
/*  - Une facture = preuve légale immuable                                    */
/*  - Toute modification après émission est interdite                         */
/*  - Hash cryptographique de vérification                                    */
/*  - Totaux toujours recalculés                                               */
/*  - Audit / Justice / IA / Régulateur ready                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, { Schema, Document, Model } from "mongoose";
import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* ENUMS                                                                      */
/* -------------------------------------------------------------------------- */

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "CANCELLED"
  | "OVERDUE";

export type InvoicePaymentMode =
  | "CASH"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"
  | "CARD"
  | "CRYPTO"
  | "ESCROW"
  | "INTERNAL_WALLET";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface InvoiceParty {
  name: string;
  ownerType: "PERSON" | "ORGANIZATION";
  ownerId: mongoose.Types.ObjectId;

  address?: string;
  email?: string;
  phone?: string;

  taxId?: string;
  countryCode?: string;
}

export interface InvoiceItem {
  sku?: string;
  label: string;
  description?: string;

  quantity: number;
  unitPrice: number;

  taxRate?: number; // %
  total: number; // computed
}

export interface InvoiceTaxSummary {
  label: string; // TVA, VAT, TAX, etc.
  rate: number;
  amount: number;
}

export interface InvoiceMeta {
  module: string;
  entityId?: string;

  generatedBy: "SYSTEM" | "MODULE" | "ADMIN";
  trustScoreAtGeneration?: number;

  locale?: string;
  timezone?: string;

  notes?: string;
}

export interface InvoiceIntegrity {
  hash: string;        // SHA256
  algorithm: "SHA256";
  generatedAt: Date;
}

export interface InvoiceDocument extends Document {
  reference: string;

  issuer: InvoiceParty;
  recipient: InvoiceParty;

  items: InvoiceItem[];

  currency: string;

  subtotal: number;
  taxes: InvoiceTaxSummary[];
  taxTotal: number;
  totalAmount: number;

  paidAmount: number;
  remainingAmount: number;

  paymentMode?: InvoicePaymentMode;

  status: InvoiceStatus;

  relatedTransactionIds?: mongoose.Types.ObjectId[];

  integrity?: InvoiceIntegrity;

  meta: InvoiceMeta;

  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;

  createdAt: Date;
}

/* -------------------------------------------------------------------------- */
/* SUB SCHEMAS                                                                */
/* -------------------------------------------------------------------------- */

const InvoicePartySchema = new Schema<InvoiceParty>(
  {
    name: { type: String, required: true, trim: true },
    ownerType: {
      type: String,
      enum: ["PERSON", "ORGANIZATION"],
      required: true,
    },
    ownerId: { type: Schema.Types.ObjectId, required: true },

    address: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },

    taxId: { type: String, trim: true },
    countryCode: { type: String, uppercase: true, trim: true },
  },
  { _id: false }
);

const InvoiceItemSchema = new Schema<InvoiceItem>(
  {
    sku: { type: String, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },

    taxRate: { type: Number, min: 0, max: 100 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceTaxSummarySchema = new Schema<InvoiceTaxSummary>(
  {
    label: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceIntegritySchema = new Schema<InvoiceIntegrity>(
  {
    hash: { type: String, required: true, index: true },
    algorithm: {
      type: String,
      enum: ["SHA256"],
      required: true,
    },
    generatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const InvoiceMetaSchema = new Schema<InvoiceMeta>(
  {
    module: { type: String, required: true, index: true },
    entityId: { type: String, trim: true },

    generatedBy: {
      type: String,
      enum: ["SYSTEM", "MODULE", "ADMIN"],
      required: true,
    },

    trustScoreAtGeneration: {
      type: Number,
      min: 0,
      max: 100,
    },

    locale: { type: String, trim: true },
    timezone: { type: String, trim: true },

    notes: { type: String, trim: true },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* MAIN SCHEMA                                                                */
/* -------------------------------------------------------------------------- */

const InvoiceSchema = new Schema<InvoiceDocument>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    issuer: { type: InvoicePartySchema, required: true },
    recipient: { type: InvoicePartySchema, required: true },

    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: [
        (v: InvoiceItem[]) => v.length > 0,
        "Invoice must contain at least one item",
      ],
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    subtotal: { type: Number, required: true, min: 0 },

    taxes: {
      type: [InvoiceTaxSummarySchema],
      default: [],
    },

    taxTotal: { type: Number, required: true, min: 0 },

    totalAmount: { type: Number, required: true, min: 0 },

    paidAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: [
        "CASH",
        "MOBILE_MONEY",
        "BANK_TRANSFER",
        "CARD",
        "CRYPTO",
        "ESCROW",
        "INTERNAL_WALLET",
      ],
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "ISSUED",
        "PAID",
        "PARTIALLY_PAID",
        "CANCELLED",
        "OVERDUE",
      ],
      default: "DRAFT",
      index: true,
    },

    relatedTransactionIds: [
      { type: Schema.Types.ObjectId, ref: "Transaction" },
    ],

    integrity: {
      type: InvoiceIntegritySchema,
    },

    meta: { type: InvoiceMetaSchema, required: true },

    issuedAt: Date,
    dueAt: Date,
    paidAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* IMMUTABILITY GUARD                                                         */
/* -------------------------------------------------------------------------- */

InvoiceSchema.pre("save", function (next) {
  if (!this.isNew && this.status !== "DRAFT") {
    return next(
      new Error(
        "Issued invoice is immutable and cannot be modified"
      )
    );
  }
  next();
});

/* -------------------------------------------------------------------------- */
/* TOTALS AUTO COMPUTE                                                        */
/* -------------------------------------------------------------------------- */

InvoiceSchema.pre("validate", function (next) {
  const subtotal = this.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  this.subtotal = Number(subtotal.toFixed(2));

  const taxesMap = new Map<string, InvoiceTaxSummary>();

  this.items.forEach((item) => {
    const rate = item.taxRate || 0;
    const taxAmount =
      (item.quantity * item.unitPrice * rate) / 100;

    item.total = Number(
      (item.quantity * item.unitPrice + taxAmount).toFixed(2)
    );

    if (rate > 0) {
      const key = `${rate}`;
      const existing = taxesMap.get(key);

      if (existing) {
        existing.amount += taxAmount;
      } else {
        taxesMap.set(key, {
          label: "TAX",
          rate,
          amount: taxAmount,
        });
      }
    }
  });

  this.taxes = Array.from(taxesMap.values()).map((t) => ({
    ...t,
    amount: Number(t.amount.toFixed(2)),
  }));

  this.taxTotal = Number(
    this.taxes.reduce((sum, t) => sum + t.amount, 0).toFixed(2)
  );

  this.totalAmount = Number(
    (this.subtotal + this.taxTotal).toFixed(2)
  );

  this.remainingAmount = Number(
    (this.totalAmount - this.paidAmount).toFixed(2)
  );

  next();
});

/* -------------------------------------------------------------------------- */
/* INTEGRITY HASH GENERATION                                                  */
/* -------------------------------------------------------------------------- */

InvoiceSchema.pre("save", function (next) {
  if (this.status === "ISSUED" && !this.integrity) {
    const payload = JSON.stringify({
      reference: this.reference,
      issuer: this.issuer,
      recipient: this.recipient,
      items: this.items,
      currency: this.currency,
      totalAmount: this.totalAmount,
      issuedAt: this.issuedAt,
    });

    const hash = crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex");

    this.integrity = {
      hash,
      algorithm: "SHA256",
      generatedAt: new Date(),
    };
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

InvoiceSchema.index({ "issuer.ownerId": 1 });
InvoiceSchema.index({ "recipient.ownerId": 1 });
InvoiceSchema.index({ status: 1, dueAt: 1 });
InvoiceSchema.index({ "meta.module": 1 });
InvoiceSchema.index({ createdAt: -1 });

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const InvoiceModel: Model<InvoiceDocument> =
  mongoose.models.Invoice ||
  mongoose.model<InvoiceDocument>("Invoice", InvoiceSchema);
