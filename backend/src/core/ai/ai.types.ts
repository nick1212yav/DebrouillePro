/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AI TYPES (WORLD #1 FINAL)                               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/ai/ai.types.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Définir les contrats universels de l’IA centrale                        */
/*   - Normaliser profils, décisions, signaux, recommandations                */
/*   - Garantir l’interopérabilité entre moteurs IA                           */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*   - Typage strict                                                          */
/*   - Sémantique claire                                                      */
/*   - Zéro dépendance métier                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  ID,
  ISODateString,
  JsonValue,
} from "../../shared/types";

/* -------------------------------------------------------------------------- */
/* AI ENGINE / PROVIDER                                                       */
/* -------------------------------------------------------------------------- */

export type AIEngine =
  | "internal"
  | "rules"
  | "ml"
  | "llm"
  | "hybrid";

/* -------------------------------------------------------------------------- */
/* AI TASK                                                                    */
/* -------------------------------------------------------------------------- */

export type AITaskType =
  | "recommendation"
  | "classification"
  | "prediction"
  | "scoring"
  | "generation"
  | "anomaly_detection"
  | "optimization";

/* -------------------------------------------------------------------------- */
/* AI CONFIDENCE                                                              */
/* -------------------------------------------------------------------------- */

export type AIConfidence =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

/* -------------------------------------------------------------------------- */
/* AI SIGNAL                                                                  */
/* -------------------------------------------------------------------------- */
/**
 * Signal faible utilisé par les moteurs IA.
 * Exemple :
 *  - comportement utilisateur
 *  - événement système
 *  - donnée contextuelle
 */
export interface AISignal {
  readonly name: string;
  readonly value: JsonValue;
  readonly confidence?: AIConfidence;
  readonly source?: string;
  readonly capturedAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* AI FEATURE                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * Feature vectorisée consommée par un moteur IA.
 */
export interface AIFeature {
  readonly key: string;
  readonly value: number | string | boolean;
}

/* -------------------------------------------------------------------------- */
/* AI DECISION                                                                */
/* -------------------------------------------------------------------------- */
/**
 * Résultat produit par un moteur IA.
 */
export interface AIDecision<TResult = JsonValue> {
  readonly id: ID;
  readonly task: AITaskType;
  readonly engine: AIEngine;
  readonly result: TResult;
  readonly confidence: AIConfidence;
  readonly explanation?: string;
  readonly features?: ReadonlyArray<AIFeature>;
  readonly createdAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* AI RECOMMENDATION                                                          */
/* -------------------------------------------------------------------------- */

export interface AIRecommendation<TPayload = JsonValue> {
  readonly id: ID;
  readonly label: string;
  readonly payload: TPayload;
  readonly score: number; // 0 → 1
  readonly reason?: string;
}

/* -------------------------------------------------------------------------- */
/* AI PROFILE                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * Profil cognitif long terme d’une identité.
 */
export interface AIProfile {
  readonly id: ID;
  readonly ownerId: ID;

  /** Préférences apprises */
  readonly preferences: Record<string, JsonValue>;

  /** Signaux agrégés */
  readonly signals: ReadonlyArray<AISignal>;

  /** Métriques IA */
  readonly metrics: {
    readonly accuracy?: number;
    readonly freshness?: number;
    readonly coverage?: number;
  };

  readonly updatedAt: ISODateString;
  readonly createdAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* AI REQUEST                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * Requête IA normalisée interne.
 */
export interface AIRequest<TInput = JsonValue> {
  readonly requestId: string;
  readonly task: AITaskType;
  readonly engine?: AIEngine;
  readonly input: TInput;
  readonly context?: Record<string, JsonValue>;
  readonly issuedAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* AI RESPONSE                                                                */
/* -------------------------------------------------------------------------- */

export interface AIResponse<TResult = JsonValue> {
  readonly requestId: string;
  readonly decision: AIDecision<TResult>;
  readonly recommendations?: ReadonlyArray<
    AIRecommendation
  >;
  readonly latencyMs: number;
  readonly servedAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* AI EVENTS                                                                  */
/* -------------------------------------------------------------------------- */

export type AIEventType =
  | "AI_REQUESTED"
  | "AI_DECISION_MADE"
  | "AI_RECOMMENDATION_EMITTED"
  | "AI_PROFILE_UPDATED"
  | "AI_ERROR";

export interface AIEvent<TPayload = JsonValue> {
  readonly id: ID;
  readonly type: AIEventType;
  readonly payload: TPayload;
  readonly occurredAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* AI ERRORS                                                                  */
/* -------------------------------------------------------------------------- */

export type AIErrorCode =
  | "AI_ENGINE_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_INVALID_INPUT"
  | "AI_MODEL_ERROR"
  | "AI_INTERNAL_ERROR";

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */

export const normalizeConfidence = (
  score: number
): AIConfidence => {
  if (score >= 0.9) return "HIGH";
  if (score >= 0.7) return "MEDIUM";
  if (score >= 0.4) return "LOW";
  return "CRITICAL";
};
