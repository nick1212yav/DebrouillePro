/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AI PROFILE MODEL (WORLD #1 FINAL)                      */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/ai/aiProfile.model.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Persister le profil cognitif IA d’une identité                          */
/*   - Stocker préférences, signaux, métriques                                */
/*   - Supporter apprentissage continu                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

import {
  AIProfile,
  AISignal,
} from "./ai.types";

/* -------------------------------------------------------------------------- */
/* DOCUMENT INTERFACE                                                         */
/* -------------------------------------------------------------------------- */

export interface AIProfileDocument
  extends AIProfile,
    Document {}

/* -------------------------------------------------------------------------- */
/* SIGNAL SUB-SCHEMA                                                          */
/* -------------------------------------------------------------------------- */

const AISignalSchema = new Schema<AISignal>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    confidence: {
      type: String,
      required: false,
    },
    source: {
      type: String,
      required: false,
    },
    capturedAt: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* AI PROFILE SCHEMA                                                          */
/* -------------------------------------------------------------------------- */

const AIProfileSchema = new Schema<AIProfileDocument>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },

    preferences: {
      type: Schema.Types.Mixed,
      default: {},
    },

    signals: {
      type: [AISignalSchema],
      default: [],
    },

    metrics: {
      accuracy: { type: Number },
      freshness: { type: Number },
      coverage: { type: Number },
    },

    updatedAt: {
      type: String,
      required: true,
    },

    createdAt: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
    collection: "ai_profiles",
  }
);

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

AIProfileSchema.index({
  ownerId: 1,
});

/* -------------------------------------------------------------------------- */
/* MODEL EXPORT                                                               */
/* -------------------------------------------------------------------------- */

export const AIProfileModel: Model<AIProfileDocument> =
  mongoose.models.AIProfile ??
  mongoose.model<AIProfileDocument>(
    "AIProfile",
    AIProfileSchema
  );
