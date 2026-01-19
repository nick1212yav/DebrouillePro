/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — SUGGESTION ENGINE (ANTICIPATION CORE)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/intelligence/suggestion.engine.ts           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Anticiper les besoins utilisateurs                                    */
/*   - Générer suggestions proactives                                        */
/*   - Booster découverte, rétention, utilité humaine                        */
/*   - Fonctionner online + offline                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { IdentityContext } from "../../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SuggestionType =
  | "NEXT_ACTION"
  | "DISCOVERY"
  | "SAFETY"
  | "OPTIMIZATION"
  | "LEARNING"
  | "OPPORTUNITY";

export interface SuggestionContext {
  lastQueries?: string[];
  location?: {
    country?: string;
    city?: string;
  };
  timeOfDay?: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
  device?: "MOBILE" | "DESKTOP" | "LOW_BANDWIDTH";
  networkQuality?: number; // 0–100
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  label: string;
  confidence: number; // 0–1
  payload?: Record<string, unknown>;
  explain?: string;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL KNOWLEDGE BASE                                                    */
/* -------------------------------------------------------------------------- */

const COMMON_PATTERNS = [
  {
    trigger: /hotel|logement|maison/i,
    suggest: "Voir les logements proches",
    type: "DISCOVERY" as SuggestionType,
  },
  {
    trigger: /emploi|travail|job/i,
    suggest: "Découvrir les offres locales",
    type: "OPPORTUNITY" as SuggestionType,
  },
  {
    trigger: /santé|hopital|pharmacie/i,
    suggest: "Voir les services de santé proches",
    type: "SAFETY" as SuggestionType,
  },
  {
    trigger: /livraison|colis/i,
    suggest: "Planifier une livraison",
    type: "NEXT_ACTION" as SuggestionType,
  },
];

/* -------------------------------------------------------------------------- */
/* SIGNAL EXTRACTION                                                          */
/* -------------------------------------------------------------------------- */

function inferFromQueries(
  queries: string[] = []
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const q of queries) {
    for (const pattern of COMMON_PATTERNS) {
      if (pattern.trigger.test(q)) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: pattern.type,
          label: pattern.suggest,
          confidence: 0.72,
          explain: `Basé sur votre recherche "${q}"`,
        });
      }
    }
  }

  return suggestions;
}

/* -------------------------------------------------------------------------- */
/* CONTEXTUAL SIGNALS                                                         */
/* -------------------------------------------------------------------------- */

function inferFromContext(
  ctx?: SuggestionContext
): Suggestion[] {
  if (!ctx) return [];

  const suggestions: Suggestion[] = [];

  if (ctx.timeOfDay === "MORNING") {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "NEXT_ACTION",
      label: "Voir les tâches prioritaires du jour",
      confidence: 0.6,
    });
  }

  if (
    ctx.networkQuality !== undefined &&
    ctx.networkQuality < 40
  ) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "OPTIMIZATION",
      label: "Activer le mode faible connexion",
      confidence: 0.8,
    });
  }

  if (ctx.device === "LOW_BANDWIDTH") {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "OPTIMIZATION",
      label: "Basculer vers interface allégée",
      confidence: 0.85,
    });
  }

  return suggestions;
}

/* -------------------------------------------------------------------------- */
/* IDENTITY SIGNALS                                                           */
/* -------------------------------------------------------------------------- */

function inferFromIdentity(
  identity?: IdentityContext
): Suggestion[] {
  if (!identity) return [];

  const suggestions: Suggestion[] = [];

  if (
    identity.trustScore < 30 &&
    identity.identity.kind === "PERSON"
  ) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "LEARNING",
      label: "Compléter votre profil pour gagner en confiance",
      confidence: 0.9,
    });
  }

  return suggestions;
}

/* -------------------------------------------------------------------------- */
/* DEDUPLICATION                                                              */
/* -------------------------------------------------------------------------- */

function deduplicate(
  suggestions: Suggestion[]
): Suggestion[] {
  const map = new Map<string, Suggestion>();

  for (const s of suggestions) {
    map.set(s.label, s);
  }

  return Array.from(map.values());
}

/* -------------------------------------------------------------------------- */
/* SUGGESTION ENGINE                                                          */
/* -------------------------------------------------------------------------- */

export class SuggestionEngine {
  static generate(params: {
    identity?: IdentityContext;
    context?: SuggestionContext;
  }): Suggestion[] {
    const fromQueries = inferFromQueries(
      params.context?.lastQueries
    );

    const fromContext = inferFromContext(
      params.context
    );

    const fromIdentity = inferFromIdentity(
      params.identity
    );

    const merged = deduplicate([
      ...fromQueries,
      ...fromContext,
      ...fromIdentity,
    ]);

    return merged.sort(
      (a, b) => b.confidence - a.confidence
    );
  }
}
