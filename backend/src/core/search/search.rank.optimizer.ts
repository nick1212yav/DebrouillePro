/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — RANK OPTIMIZER ENGINE (WORLD #1)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.rank.optimizer.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Réordonner dynamiquement les résultats                                 */
/*   - Apprendre du comportement utilisateur                                  */
/*   - Maximiser pertinence, diversité, équité                                 */
/*   - Auto-ajustement continu                                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

import {
  SearchQuery,
  SearchResult,
} from "./search.types";

/* -------------------------------------------------------------------------- */
/* BEHAVIOR SIGNALS                                                           */
/* -------------------------------------------------------------------------- */

type ClickSignal = {
  resultId: string;
  score: number;
  timestamp: number;
};

type RankingProfile = {
  affinity: Record<string, number>;
  biasPenalty: Record<string, number>;
  lastUpdatedAt: number;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL MEMORY (HOT CACHE)                                                */
/* -------------------------------------------------------------------------- */

const clickStore = new Map<string, ClickSignal[]>();
const rankingProfiles = new Map<string, RankingProfile>();

/* -------------------------------------------------------------------------- */
/* RANK OPTIMIZER                                                             */
/* -------------------------------------------------------------------------- */

export class SearchRankOptimizer {
  /* ======================================================================== */
  /* RANK                                                                     */
  /* ======================================================================== */

  rank(params: {
    query: SearchQuery;
    results: SearchResult[];
    actorId?: string;
  }): SearchResult[] {
    const profile = this.resolveProfile(params.actorId);

    return [...params.results]
      .map((result) => ({
        ...result,
        _rankScore: this.computeScore(
          result,
          params.query,
          profile
        ),
      }))
      .sort((a, b) => b._rankScore - a._rankScore)
      .slice(0, params.query.limit ?? 50);
  }

  /* ======================================================================== */
  /* LEARNING                                                                 */
  /* ======================================================================== */

  recordClick(params: {
    actorId?: string;
    result: SearchResult;
    position: number;
  }) {
    if (!params.actorId) return;

    const signals =
      clickStore.get(params.actorId) ?? [];

    signals.push({
      resultId: params.result.id,
      score: 1 / (params.position + 1),
      timestamp: Date.now(),
    });

    clickStore.set(params.actorId, signals);

    this.updateProfile(params.actorId, signals);
  }

  /* ======================================================================== */
  /* PROFILE                                                                  */
  /* ======================================================================== */

  private resolveProfile(
    actorId?: string
  ): RankingProfile {
    if (!actorId) {
      return {
        affinity: {},
        biasPenalty: {},
        lastUpdatedAt: Date.now(),
      };
    }

    return (
      rankingProfiles.get(actorId) ??
      this.createProfile(actorId)
    );
  }

  private createProfile(
    actorId: string
  ): RankingProfile {
    const profile: RankingProfile = {
      affinity: {},
      biasPenalty: {},
      lastUpdatedAt: Date.now(),
    };

    rankingProfiles.set(actorId, profile);
    return profile;
  }

  private updateProfile(
    actorId: string,
    signals: ClickSignal[]
  ) {
    const profile = this.resolveProfile(actorId);

    for (const signal of signals.slice(-20)) {
      profile.affinity[signal.resultId] =
        (profile.affinity[signal.resultId] || 0) +
        signal.score;
    }

    profile.lastUpdatedAt = Date.now();
    rankingProfiles.set(actorId, profile);
  }

  /* ======================================================================== */
  /* SCORING                                                                  */
  /* ======================================================================== */

  private computeScore(
    result: SearchResult,
    query: SearchQuery,
    profile: RankingProfile
  ): number {
    let score = result.relevanceScore ?? 1;

    /* --------------------------------------------------------------- */
    /* PERSONAL AFFINITY                                               */
    /* --------------------------------------------------------------- */

    if (profile.affinity[result.id]) {
      score *=
        1 +
        Math.min(
          profile.affinity[result.id] / 10,
          0.5
        );
    }

    /* --------------------------------------------------------------- */
    /* RECENCY BOOST                                                   */
    /* --------------------------------------------------------------- */

    if (result.updatedAt) {
      const ageHours =
        (Date.now() -
          new Date(result.updatedAt).getTime()) /
        3_600_000;

      score *= 1 + Math.exp(-ageHours / 24);
    }

    /* --------------------------------------------------------------- */
    /* DIVERSITY PENALTY                                               */
    /* --------------------------------------------------------------- */

    if (result.category) {
      const bias =
        profile.biasPenalty[result.category] || 0;
      score *= 1 - Math.min(bias, 0.3);
    }

    /* --------------------------------------------------------------- */
    /* QUERY INTENT BOOST                                              */
    /* --------------------------------------------------------------- */

    if (
      query.text
        .toLowerCase()
        .includes(result.title.toLowerCase())
    ) {
      score *= 1.2;
    }

    return score;
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchRankOptimizer =
  new SearchRankOptimizer();
