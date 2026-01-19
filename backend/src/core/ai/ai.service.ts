/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AI SERVICE (WORLD #1 FINAL)                             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/ai/ai.service.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Orchestrer l’intelligence centrale                                     */
/*   - Gérer la mémoire IA persistante                                         */
/*   - Normaliser décisions, signaux et recommandations                        */
/*   - Préparer l’intégration ML / LLM / règles                                */
/*                                                                            */
/*  PRINCIPES :                                                               */
/*   - IA déterministe + explicable                                            */
/*   - Pas de dépendance métier                                                */
/*   - Auditabilité totale                                                     */
/*   - Scalabilité horizontale                                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { randomUUID } from "crypto";

import {
  AIProfile,
  AISignal,
  AIRequest,
  AIResponse,
  AIDecision,
  AIRecommendation,
  AITaskType,
  AIEngine,
  AIConfidence,
  normalizeConfidence,
} from "./ai.types";

import {
  AIProfileModel,
  AIProfileDocument,
} from "./aiProfile.model";

/* -------------------------------------------------------------------------- */
/* TYPES INTERNES                                                             */
/* -------------------------------------------------------------------------- */

export type AIExecutionContext = {
  /** Identité logique propriétaire du profil IA */
  ownerId: string;

  /** Origine de l’appel */
  source?: string;
};

export type SignalInput = Omit<
  AISignal,
  "capturedAt"
> & {
  capturedAt?: string;
};

export type RecommendationInput<T = unknown> =
  Omit<AIRecommendation<T>, "id">;

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILS                                                             */
/* -------------------------------------------------------------------------- */

const nowISO = (): string =>
  new Date().toISOString();

/**
 * Nettoyage défensif des signaux anciens si nécessaire.
 * (prêt pour politique de rétention future)
 */
const pruneSignals = (
  profile: AIProfileDocument,
  maxSignals = 5_000
) => {
  if (profile.signals.length > maxSignals) {
    profile.signals.splice(
      0,
      profile.signals.length - maxSignals
    );
  }
};

/* -------------------------------------------------------------------------- */
/* AI SERVICE                                                                 */
/* -------------------------------------------------------------------------- */

export class AIService {
  /* ====================================================================== */
  /* PROFILE LIFECYCLE                                                      */
  /* ====================================================================== */

  /**
   * Récupérer ou créer un profil IA.
   */
  static async getOrCreateProfile(
    context: AIExecutionContext
  ): Promise<AIProfileDocument> {
    let profile =
      await AIProfileModel.findOne({
        ownerId: context.ownerId,
      });

    if (profile) return profile;

    const now = nowISO();

    profile = await AIProfileModel.create({
      ownerId: context.ownerId,
      preferences: {},
      signals: [],
      metrics: {},
      createdAt: now,
      updatedAt: now,
    });

    return profile;
  }

  /* ====================================================================== */
  /* SIGNAL INGESTION                                                       */
  /* ====================================================================== */

  /**
   * Enregistrer un signal faible (observation).
   */
  static async ingestSignal(
    context: AIExecutionContext,
    input: SignalInput
  ): Promise<AIProfile> {
    const profile =
      await AIService.getOrCreateProfile(
        context
      );

    const signal: AISignal = {
      name: input.name,
      value: input.value,
      confidence: input.confidence,
      source: input.source ?? context.source,
      capturedAt: input.capturedAt ?? nowISO(),
    };

    profile.signals.push(signal);
    pruneSignals(profile);

    profile.updatedAt = nowISO();
    await profile.save();

    return profile.toObject();
  }

  /* ====================================================================== */
  /* PREFERENCES                                                            */
  /* ====================================================================== */

  /**
   * Mettre à jour une préférence apprise.
   */
  static async updatePreference(
    context: AIExecutionContext,
    key: string,
    value: unknown
  ): Promise<AIProfile> {
    const profile =
      await AIService.getOrCreateProfile(
        context
      );

    profile.preferences[key] = value;
    profile.updatedAt = nowISO();

    await profile.save();
    return profile.toObject();
  }

  /* ====================================================================== */
  /* DECISION ENGINE (BASELINE)                                              */
  /* ====================================================================== */

  /**
   * Exécuter une requête IA interne normalisée.
   * (Stub extensible pour ML / LLM / Rules Engine)
   */
  static async execute<TInput, TResult>(
    request: AIRequest<TInput>
  ): Promise<AIResponse<TResult>> {
    const startedAt = Date.now();

    /**
     * ⚠️ MVP heuristique volontairement simple.
     * Remplacé plus tard par moteur hybride.
     */
    const decision: AIDecision<TResult> = {
      id: randomUUID(),
      task: request.task,
      engine: request.engine ?? "internal",
      result: request.input as unknown as TResult,
      confidence: normalizeConfidence(0.75),
      createdAt: nowISO(),
      explanation:
        "Baseline inference engine (pass-through)",
    };

    const latencyMs = Date.now() - startedAt;

    return {
      requestId: request.requestId,
      decision,
      latencyMs,
      servedAt: nowISO(),
    };
  }

  /* ====================================================================== */
  /* RECOMMENDATIONS                                                        */
  /* ====================================================================== */

  /**
   * Construire une recommandation normalisée.
   */
  static buildRecommendation<T>(
    input: RecommendationInput<T>
  ): AIRecommendation<T> {
    return {
      id: randomUUID(),
      label: input.label,
      payload: input.payload,
      score: input.score,
      reason: input.reason,
    };
  }

  /* ====================================================================== */
  /* HIGH LEVEL API                                                          */
  /* ====================================================================== */

  /**
   * Pipeline complet :
   *  - Ingestion signal
   *  - Décision IA
   *  - Retour réponse normalisée
   */
  static async processSignal<TInput, TResult>(
    context: AIExecutionContext,
    task: AITaskType,
    input: TInput,
    engine: AIEngine = "internal"
  ): Promise<AIResponse<TResult>> {
    const request: AIRequest<TInput> = {
      requestId: randomUUID(),
      task,
      engine,
      input,
      issuedAt: nowISO(),
    };

    return AIService.execute<TInput, TResult>(
      request
    );
  }
}
