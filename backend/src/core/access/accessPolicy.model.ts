/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE ACCESS — ACCESS POLICY MODEL (WORLD #1 CANONICAL)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/access/accessPolicy.model.ts                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*   - Stocker les règles d’accès comme DONNÉES gouvernées                    */
/*   - Supporter versioning, audit, temporalité, rollback                     */
/*   - Source unique consommée par AccessEngine                               */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*   - Zéro logique métier                                                    */
/*   - Zéro dépendance Identity / HTTP                                        */
/*   - 100 % déclaratif                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  Schema,
  model,
  Types,
  Document,
  Model,
} from "mongoose";

import {
  AccessDecision,
  AccessCondition,
} from "./access.types";

/* -------------------------------------------------------------------------- */
/* ENUMS                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Cycle de vie d’une politique.
 */
export enum AccessPolicyStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DEPRECATED = "DEPRECATED",
  ARCHIVED = "ARCHIVED",
}

/**
 * Portée fonctionnelle d’une politique.
 */
export enum AccessPolicyScope {
  GLOBAL = "GLOBAL",
  PERSON_ONLY = "PERSON_ONLY",
  ORGANIZATION_ONLY = "ORGANIZATION_ONLY",
  GUEST_ONLY = "GUEST_ONLY",
  SYSTEM_ONLY = "SYSTEM_ONLY",
}

/* -------------------------------------------------------------------------- */
/* BASE CONTRACT                                                              */
/* -------------------------------------------------------------------------- */

export interface AccessPolicyAttributes {
  /* Target */
  readonly module: string;
  readonly action: string;

  /* Conditions */
  readonly conditions: ReadonlyArray<AccessCondition>;

  /* Decision */
  readonly fallbackDecision: AccessDecision;

  /* Governance */
  readonly scope: AccessPolicyScope;
  readonly priority: number;

  /* Metadata */
  readonly name: string;
  readonly description?: string;
  readonly version: number;

  /* Lifecycle */
  readonly status: AccessPolicyStatus;
  readonly effectiveFrom?: Date;
  readonly effectiveTo?: Date;

  /* Audit */
  readonly createdBy?: Types.ObjectId;
}

/**
 * Document Mongo complet.
 */
export interface AccessPolicyDocument
  extends AccessPolicyAttributes,
    Document {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Interface du modèle Mongoose.
 */
export interface AccessPolicyModel
  extends Model<AccessPolicyDocument> {
  /**
   * Charger les politiques actives applicables.
   */
  findActivePolicies(
    module: string,
    action: string
  ): Promise<AccessPolicyDocument[]>;
}

/* -------------------------------------------------------------------------- */
/* SUB-SCHEMAS                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Schéma atomique d’une condition.
 */
const AccessConditionSchema = new Schema<AccessCondition>(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    _id: false,
    strict: true,
  }
);

/* -------------------------------------------------------------------------- */
/* MAIN SCHEMA                                                                */
/* -------------------------------------------------------------------------- */

const AccessPolicySchema = new Schema<
  AccessPolicyDocument,
  AccessPolicyModel
>(
  {
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    conditions: {
      type: [AccessConditionSchema],
      default: [],
      validate: {
        validator: (v: AccessCondition[]) =>
          Array.isArray(v),
        message: "Conditions must be an array",
      },
    },

    fallbackDecision: {
      type: String,
      enum: Object.values(AccessDecision),
      required: true,
    },

    scope: {
      type: String,
      enum: Object.values(AccessPolicyScope),
      default: AccessPolicyScope.GLOBAL,
      index: true,
    },

    priority: {
      type: Number,
      default: 0,
      index: true,
      min: -1000,
      max: 1000,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: Object.values(AccessPolicyStatus),
      default: AccessPolicyStatus.ACTIVE,
      index: true,
    },

    effectiveFrom: {
      type: Date,
      index: true,
    },

    effectiveTo: {
      type: Date,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Recherche principale du moteur d’accès.
 */
AccessPolicySchema.index({
  module: 1,
  action: 1,
  status: 1,
  scope: 1,
  priority: -1,
});

/**
 * Versioning gouverné.
 */
AccessPolicySchema.index(
  {
    module: 1,
    action: 1,
    version: 1,
  },
  { unique: true }
);

/**
 * Fenêtre temporelle.
 */
AccessPolicySchema.index({
  effectiveFrom: 1,
  effectiveTo: 1,
});

/* -------------------------------------------------------------------------- */
/* VALIDATIONS FORTES                                                        */
/* -------------------------------------------------------------------------- */

AccessPolicySchema.pre("validate", function (next) {
  if (
    this.effectiveFrom &&
    this.effectiveTo &&
    this.effectiveFrom > this.effectiveTo
  ) {
    return next(
      new Error(
        "effectiveFrom cannot be after effectiveTo"
      )
    );
  }

  if (
    this.status === AccessPolicyStatus.ACTIVE &&
    this.priority === undefined
  ) {
    return next(
      new Error(
        "Active policy must define a priority"
      )
    );
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* SOFT DELETE PROTECTION                                                     */
/* -------------------------------------------------------------------------- */

AccessPolicySchema.pre(
  "deleteOne",
  { document: true },
  function (next) {
    return next(
      new Error(
        "Physical deletion of AccessPolicy is forbidden. Use status=ARCHIVED."
      )
    );
  }
);

/* -------------------------------------------------------------------------- */
/* STATIC HELPERS                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Charger uniquement les politiques applicables.
 */
AccessPolicySchema.statics.findActivePolicies =
  async function (
    module: string,
    action: string
  ): Promise<AccessPolicyDocument[]> {
    const now = new Date();

    return this.find({
      module,
      action,
      status: AccessPolicyStatus.ACTIVE,
      $or: [
        { effectiveFrom: { $exists: false } },
        { effectiveFrom: { $lte: now } },
      ],
      $or2: [
        { effectiveTo: { $exists: false } },
        { effectiveTo: { $gte: now } },
      ],
    })
      .sort({ priority: -1 })
      .exec();
  };

/* -------------------------------------------------------------------------- */
/* EXPORT MODEL                                                               */
/* -------------------------------------------------------------------------- */

export const AccessPolicyModel =
  model<AccessPolicyDocument, AccessPolicyModel>(
    "AccessPolicy",
    AccessPolicySchema
  );

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Ce modèle est gouvernable sans migration destructive
 * ✔️ Compatible multi-pays / conformité
 * ✔️ Prêt IA / audit / analytics
 * ✔️ Aucune dépendance métier
 *
 * Durée de vie cible : 10+ ans
 */
