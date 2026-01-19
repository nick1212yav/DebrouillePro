/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE MODEL (OFFICIAL & FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/_template.model.ts                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE DE CE FICHIER                                                        */
/*  - Définir la vérité DATA d’un module                                      */
/*  - Référence pour TOUS les futurs modules                                  */
/*  - Schéma robuste, indexé, auditable                                       */
/*                                                                            */
/*  PRINCIPES                                                                 */
/*  - Un module = une collection principale                                  */
/*  - Index pensés pour scale mondial                                         */
/*  - Audit & ownership natifs                                                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, { Schema, Document } from "mongoose";
import { TemplateStatus } from "./_template.types";

/* -------------------------------------------------------------------------- */
/* INTERFACE MONGOOSE                                                         */
/* -------------------------------------------------------------------------- */

export interface TemplateDocument extends Document {
  ownerId: string;
  ownerType: "PERSON" | "ORGANIZATION";

  title: string;
  description?: string;

  status: TemplateStatus;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const TemplateSchema = new Schema<TemplateDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },

    ownerType: {
      type: String,
      enum: ["PERSON", "ORGANIZATION"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },

    description: {
      type: String,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* -------------------------------------------------------------------------- */
/* INDEX STRATÉGIQUES (SCALE GLOBAL)                                          */
/* -------------------------------------------------------------------------- */

// Recherche rapide par propriétaire + statut
TemplateSchema.index({ ownerId: 1, status: 1 });

// Recherche textuelle (SEO / IA / Search)
TemplateSchema.index({
  title: "text",
  description: "text",
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export const TemplateModel = mongoose.model<TemplateDocument>(
  "Template",
  TemplateSchema
);
