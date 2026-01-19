/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — AI CONTEXT (WORLD #1 FINAL)                             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/context/ai.context.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Transporter l’état cognitif IA pour une requête / session              */
/*   - Unifier préférences, contraintes, signaux, mémoire courte              */
/*   - Servir de base aux moteurs IA, recommandation, scoring                 */
/*                                                                            */
/*  CE CONTEXTE NE CONTIENT JAMAIS :                                           */
/*   - Clés API / secrets                                                     */
/*   - Appels réseau                                                          */
/*   - Logique métier lourde                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { ID, JsonValue } from "../../shared/types";

/* -------------------------------------------------------------------------- */
/* AI PROVIDER                                                                */
/* -------------------------------------------------------------------------- */

export type AIProvider =
  | "internal"
  | "openai"
  | "anthropic"
  | "local"
  | "hybrid";

/* -------------------------------------------------------------------------- */
/* AI CONFIDENCE                                                              */
/* -------------------------------------------------------------------------- */

export type AIConfidenceLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

/* -------------------------------------------------------------------------- */
/* AI SIGNALS                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * Un signal est une information faible provenant du contexte runtime :
 * - comportement utilisateur
 * - historique récent
 * - environnement
 * - anomalies
 */
export interface AISignal {
  readonly name: string;
  readonly value: JsonValue;
  readonly confidence?: AIConfidenceLevel;
  readonly capturedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* AI PREFERENCES                                                             */
/* -------------------------------------------------------------------------- */

export interface AIPreferences {
  /** Langue préférée pour les réponses IA */
  readonly locale?: string;

  /** Ton attendu (formel, friendly, expert, etc.) */
  readonly tone?: "neutral" | "friendly" | "expert";

  /** Niveau de détail souhaité */
  readonly verbosity?: "short" | "medium" | "long";

  /** Mode économie de calcul */
  readonly costSensitive?: boolean;

  /** Préférences libres extensibles */
  readonly custom?: Record<string, JsonValue>;
}

/* -------------------------------------------------------------------------- */
/* AI CONSTRAINTS                                                             */
/* -------------------------------------------------------------------------- */

export interface AIConstraints {
  /** Limite maximale de tokens */
  readonly maxTokens?: number;

  /** Temps maximum autorisé (ms) */
  readonly timeoutMs?: number;

  /** Niveau de risque acceptable */
  readonly riskTolerance?: "LOW" | "MEDIUM" | "HIGH";

  /** Autorisation d’utiliser des données personnelles */
  readonly allowPersonalData?: boolean;
}

/* -------------------------------------------------------------------------- */
/* AI MEMORY                                                                  */
/* -------------------------------------------------------------------------- */
/**
 * Mémoire courte durée pour enrichir les décisions IA.
 * Exemple :
 *  - dernière intention détectée
 *  - dernier résultat calculé
 */
export interface AIMemory {
  readonly key: string;
  readonly value: JsonValue;
  readonly updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* AI CONTEXT                                                                 */
/* -------------------------------------------------------------------------- */

export interface AIContext {
  /** Provider IA actif */
  readonly provider: AIProvider;

  /** Identifiant de profil IA (si existant) */
  readonly profileId?: ID;

  /** Préférences cognitives */
  readonly preferences: AIPreferences;

  /** Contraintes d’exécution */
  readonly constraints: AIConstraints;

  /** Signaux observés */
  readonly signals: ReadonlyArray<AISignal>;

  /** Mémoire courte durée */
  readonly memory: ReadonlyArray<AIMemory>;

  /** Niveau de confiance global estimé */
  readonly confidence: AIConfidenceLevel;

  /** Dernière mise à jour */
  readonly updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* DEFAULT CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export const DEFAULT_AI_CONTEXT: AIContext = Object.freeze({
  provider: "internal",
  preferences: Object.freeze({}),
  constraints: Object.freeze({}),
  signals: Object.freeze([]),
  memory: Object.freeze([]),
  confidence: "MEDIUM",
  updatedAt: new Date(0),
});

/* -------------------------------------------------------------------------- */
/* NORMALIZATION                                                              */
/* -------------------------------------------------------------------------- */

const normalizeConfidence = (
  value?: AIConfidenceLevel
): AIConfidenceLevel => value ?? "MEDIUM";

/* -------------------------------------------------------------------------- */
/* FACTORY                                                                    */
/* -------------------------------------------------------------------------- */

export interface CreateAIContextParams {
  provider?: AIProvider;
  profileId?: ID;
  preferences?: AIPreferences;
  constraints?: AIConstraints;
  signals?: AISignal[];
  memory?: AIMemory[];
  confidence?: AIConfidenceLevel;
  updatedAt?: Date;
}

export const createAIContext = (
  params?: CreateAIContextParams
): AIContext => {
  if (!params) return DEFAULT_AI_CONTEXT;

  return Object.freeze({
    provider: params.provider ?? "internal",
    profileId: params.profileId,
    preferences: Object.freeze(
      params.preferences ?? {}
    ),
    constraints: Object.freeze(
      params.constraints ?? {}
    ),
    signals: Object.freeze(
      params.signals ?? []
    ),
    memory: Object.freeze(
      params.memory ?? []
    ),
    confidence: normalizeConfidence(
      params.confidence
    ),
    updatedAt: params.updatedAt ?? new Date(),
  });
};

/* -------------------------------------------------------------------------- */
/* DERIVED HELPERS                                                            */
/* -------------------------------------------------------------------------- */

export const hasHighConfidence = (
  ctx: AIContext
): boolean =>
  ctx.confidence === "HIGH" ||
  ctx.confidence === "CRITICAL";

export const hasSignal = (
  ctx: AIContext,
  signalName: string
): boolean =>
  ctx.signals.some(
    (s) => s.name === signalName
  );

export const readMemory = (
  ctx: AIContext,
  key: string
): AIMemory | undefined =>
  ctx.memory.find((m) => m.key === key);

/* -------------------------------------------------------------------------- */
/* SERIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

export const serializeAIContext = (
  ctx: AIContext
): Record<string, unknown> => ({
  provider: ctx.provider,
  profileId: ctx.profileId,
  preferences: ctx.preferences,
  constraints: ctx.constraints,
  signals: ctx.signals.map((s) => ({
    name: s.name,
    value: s.value,
    confidence: s.confidence,
    capturedAt: s.capturedAt.toISOString(),
  })),
  memory: ctx.memory.map((m) => ({
    key: m.key,
    value: m.value,
    updatedAt: m.updatedAt.toISOString(),
  })),
  confidence: ctx.confidence,
  updatedAt: ctx.updatedAt.toISOString(),
});

/* -------------------------------------------------------------------------- */
/* PHILOSOPHIE                                                                */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Contexte IA IMMUTABLE.
 * ✔️ Aucun provider externe ici.
 * ✔️ Purement descriptif et sérialisable.
 * ✔️ Compatible audit, events, observabilité.
 * ✔️ Prêt pour moteur IA distribué futur.
 */
