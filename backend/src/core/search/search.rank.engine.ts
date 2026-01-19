/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — RANK ENGINE (WORLD #1 INTELLIGENCE CORE)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.rank.engine.ts                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Calculer un score multi-dimensionnel par résultat                       */
/*   - Mixer pertinence, confiance, distance, fraîcheur, IA                   */
/*   - Produire un classement explicable                                      */
/*                                                                            */
/*  PRINCIPES :                                                               */
/*   - Aucun accès base                                                       */
/*   - Déterministe + traçable                                                 */
/*   - Plug-in friendly                                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type RankSignal =
  | "TEXT_RELEVANCE"
  | "SEMANTIC_MATCH"
  | "TRUST_SCORE"
  | "DISTANCE"
  | "FRESHNESS"
  | "POPULARITY"
  | "PERSONALIZATION"
  | "DIVERSITY";

export interface RankableItem {
  id: string;

  textScore?: number;       // moteur
  semanticScore?: number;  // IA
  trustScore?: number;     // 0-100
  distanceKm?: number;
  createdAt?: Date;
  popularity?: number;     // vues / likes
  personalizationScore?: number;

  payload?: Record<string, unknown>;
}

export interface RankedResult {
  id: string;
  finalScore: number;
  breakdown: Record<RankSignal, number>;
  explain: string[];
  payload?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* WEIGHTS (DYNAMIC READY)                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_WEIGHTS: Record<RankSignal, number> = {
  TEXT_RELEVANCE: 0.25,
  SEMANTIC_MATCH: 0.20,
  TRUST_SCORE: 0.15,
  DISTANCE: 0.10,
  FRESHNESS: 0.10,
  POPULARITY: 0.08,
  PERSONALIZATION: 0.07,
  DIVERSITY: 0.05,
};

/* -------------------------------------------------------------------------- */
/* NORMALIZATION HELPERS                                                      */
/* -------------------------------------------------------------------------- */

const normalize = (
  value: number,
  min = 0,
  max = 1
) => {
  if (max === min) return 0;
  return Math.max(
    0,
    Math.min(1, (value - min) / (max - min))
  );
};

const daysSince = (date?: Date) => {
  if (!date) return 365;
  return (
    (Date.now() - date.getTime()) /
    (1000 * 60 * 60 * 24)
  );
};

/* -------------------------------------------------------------------------- */
/* RANK ENGINE                                                                */
/* -------------------------------------------------------------------------- */

export class SearchRankEngine {
  private weights = { ...DEFAULT_WEIGHTS };

  /* ======================================================================== */
  /* CONFIG                                                                    */
  /* ======================================================================== */

  setWeights(
    overrides: Partial<
      Record<RankSignal, number>
    >
  ) {
    this.weights = {
      ...this.weights,
      ...overrides,
    };
  }

  getWeights() {
    return { ...this.weights };
  }

  /* ======================================================================== */
  /* SCORE                                                                     */
  /* ======================================================================== */

  rank(
    items: RankableItem[]
  ): RankedResult[] {
    return items
      .map((item) => this.scoreItem(item))
      .sort(
        (a, b) =>
          b.finalScore - a.finalScore
      );
  }

  /* ======================================================================== */
  /* SINGLE ITEM SCORING                                                       */
  /* ======================================================================== */

  private scoreItem(
    item: RankableItem
  ): RankedResult {
    const breakdown: Record<
      RankSignal,
      number
    > = {
      TEXT_RELEVANCE: normalize(
        item.textScore ?? 0,
        0,
        10
      ),

      SEMANTIC_MATCH: normalize(
        item.semanticScore ?? 0,
        0,
        1
      ),

      TRUST_SCORE: normalize(
        item.trustScore ?? 0,
        0,
        100
      ),

      DISTANCE: item.distanceKm
        ? 1 -
          normalize(
            item.distanceKm,
            0,
            50
          )
        : 0.5,

      FRESHNESS: 1 -
        normalize(daysSince(item.createdAt), 0, 365),

      POPULARITY: normalize(
        item.popularity ?? 0,
        0,
        10_000
      ),

      PERSONALIZATION: normalize(
        item.personalizationScore ?? 0,
        0,
        1
      ),

      DIVERSITY: Math.random() * 0.2,
    };

    let finalScore = 0;
    const explain: string[] = [];

    for (const signal of Object.keys(
      breakdown
    ) as RankSignal[]) {
      const weighted =
        breakdown[signal] *
        (this.weights[signal] || 0);

      finalScore += weighted;

      if (weighted > 0.05) {
        explain.push(
          `${signal} boosted (+${weighted.toFixed(
            2
          )})`
        );
      }
    }

    return {
      id: item.id,
      finalScore: Number(
        finalScore.toFixed(4)
      ),
      breakdown,
      explain,
      payload: item.payload,
    };
  }

  /* ======================================================================== */
  /* A/B EXPERIMENTATION READY                                                 */
  /* ======================================================================== */

  generateExperimentId() {
    return crypto.randomUUID();
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchRankEngine =
  new SearchRankEngine();
