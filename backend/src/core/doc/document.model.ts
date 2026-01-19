/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE DOC — DOCUMENT MODEL (WORLD #1 FINAL — LOCKED)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/doc/document.model.ts                              */
/* -------------------------------------------------------------------------- */

import { Schema, model, Types, Model } from "mongoose";
import { IdentityKind } from "../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* ENUMS                                                                      */
/* -------------------------------------------------------------------------- */

export enum DocumentType {
  IDENTITY = "IDENTITY",
  CONTRACT = "CONTRACT",
  CERTIFICATE = "CERTIFICATE",
  LICENSE = "LICENSE",
  INVOICE = "INVOICE",
  RECEIPT = "RECEIPT",
  REPORT = "REPORT",
  LEGAL = "LEGAL",
  MEDICAL = "MEDICAL",
  EDUCATION = "EDUCATION",
  MEDIA = "MEDIA",
  OTHER = "OTHER",
}

export enum DocumentStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  ARCHIVED = "ARCHIVED",
}

export enum DocumentVisibility {
  PRIVATE = "PRIVATE",
  SHARED = "SHARED",
  PUBLIC = "PUBLIC",
}

/* -------------------------------------------------------------------------- */
/* DOCUMENT INTERFACE                                                         */
/* -------------------------------------------------------------------------- */

export interface IDocument {
  _id: Types.ObjectId;

  identityKind: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  type: DocumentType;
  title: string;
  description?: string;

  fileUrl: string;
  fileHash?: string;
  fileMimeType?: string;
  fileSize?: number;

  status: DocumentStatus;
  visibility: DocumentVisibility;

  issuedAt?: Date;
  expiresAt?: Date;

  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;

  relatedModule?: string;
  relatedEntityId?: Types.ObjectId;

  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;

  isExpired(): boolean;
  archive(): void;
  verify(params: {
    verifiedBy: Types.ObjectId;
    notes?: string;
  }): void;
}

/* -------------------------------------------------------------------------- */
/* MODEL STATICS                                                              */
/* -------------------------------------------------------------------------- */

export interface DocumentModelType
  extends Model<IDocument> {
  findActiveForIdentity(params: {
    identityKind: IdentityKind;
    userId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
  }): Promise<IDocument[]>;
}

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const DocumentSchema = new Schema<IDocument>(
  {
    identityKind: {
      type: String,
      enum: Object.values(IdentityKind),
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },

    type: {
      type: String,
      enum: Object.values(DocumentType),
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    fileUrl: {
      type: String,
      required: true,
      immutable: true,
    },

    fileHash: {
      type: String,
      immutable: true,
    },

    fileMimeType: { type: String, trim: true },
    fileSize: { type: Number, min: 0 },

    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.DRAFT,
    },

    visibility: {
      type: String,
      enum: Object.values(DocumentVisibility),
      default: DocumentVisibility.PRIVATE,
    },

    issuedAt: Date,
    expiresAt: Date,

    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: Date,

    verificationNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    relatedModule: {
      type: String,
      trim: true,
    },

    relatedEntityId: {
      type: Schema.Types.ObjectId,
    },

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
/* INDEXES — SINGLE SOURCE OF TRUTH                                           */
/* -------------------------------------------------------------------------- */

/** Lookup par identité */
DocumentSchema.index({
  identityKind: 1,
  userId: 1,
  organizationId: 1,
  status: 1,
});

/** Recherche métier */
DocumentSchema.index({
  type: 1,
  status: 1,
  visibility: 1,
});

/** Expiration / conformité */
DocumentSchema.index({
  expiresAt: 1,
});

/** Recherche textuelle */
DocumentSchema.index({
  title: "text",
  description: "text",
});

/** Relations */
DocumentSchema.index({
  relatedModule: 1,
  relatedEntityId: 1,
});

/** Intégrité fichier */
DocumentSchema.index({
  fileHash: 1,
});

/* -------------------------------------------------------------------------- */
/* INVARIANTS                                                                 */
/* -------------------------------------------------------------------------- */

DocumentSchema.pre("save", function (next) {
  if (
    this.identityKind === IdentityKind.PERSON &&
    !this.userId
  ) {
    return next(
      new Error("PERSON document must have userId")
    );
  }

  if (
    this.identityKind === IdentityKind.ORGANIZATION &&
    !this.organizationId
  ) {
    return next(
      new Error(
        "ORGANIZATION document must have organizationId"
      )
    );
  }

  if (
    this.expiresAt &&
    this.issuedAt &&
    this.expiresAt < this.issuedAt
  ) {
    return next(
      new Error("expiresAt cannot be before issuedAt")
    );
  }

  next();
});

/**
 * Suppression physique strictement interdite.
 */
DocumentSchema.pre(
  "deleteOne",
  { document: true },
  function (next) {
    return next(
      new Error(
        "Physical deletion of documents is forbidden"
      )
    );
  }
);

DocumentSchema.pre(
  "findOneAndDelete",
  function (next) {
    return next(
      new Error(
        "Physical deletion of documents is forbidden"
      )
    );
  }
);

/* -------------------------------------------------------------------------- */
/* INSTANCE METHODS                                                           */
/* -------------------------------------------------------------------------- */

DocumentSchema.methods.isExpired = function (): boolean {
  if (!this.expiresAt) return false;
  return this.expiresAt.getTime() < Date.now();
};

DocumentSchema.methods.archive = function (): void {
  this.status = DocumentStatus.ARCHIVED;
};

DocumentSchema.methods.verify = function (params: {
  verifiedBy: Types.ObjectId;
  notes?: string;
}): void {
  this.status = DocumentStatus.VERIFIED;
  this.verifiedBy = params.verifiedBy;
  this.verifiedAt = new Date();
  this.verificationNotes = params.notes;
};

/* -------------------------------------------------------------------------- */
/* STATIC HELPERS                                                             */
/* -------------------------------------------------------------------------- */

DocumentSchema.statics.findActiveForIdentity =
  async function (
    this: DocumentModelType,
    params: {
      identityKind: IdentityKind;
      userId?: Types.ObjectId;
      organizationId?: Types.ObjectId;
    }
  ) {
    return this.find({
      identityKind: params.identityKind,
      userId: params.userId,
      organizationId: params.organizationId,
      status: {
        $nin: [
          DocumentStatus.ARCHIVED,
          DocumentStatus.EXPIRED,
        ],
      },
    }).exec();
  };

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const DocumentModel =
  model<IDocument, DocumentModelType>(
    "Document",
    DocumentSchema
  );
