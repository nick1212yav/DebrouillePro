/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — RANKING INTELLIGENCE ENGINE (WORLD #1)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/search.ranking.engine.ts                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Fusionner GEO + TRUST + QUALITÉ + CONTEXTE                              */
/*   - Produire un classement explicable                                      */
/*   - Neutraliser spam, fake, gaming                                          */
/*   - Garantir équité et diversité                                            */
/*   - Fonctionner offline                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import { GeoPoint, haversineKm } from "./search.geo.engine";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type RankableEntity = {
  id: string;
  location?: GeoPoint;
  trustScore?: number; // 0-100
  qualityScore?: number; // 0-100
  popularityScore?: number; // 0-100
  freshnessScore?: number; // 0-100
  category?: string;
  tags?: string[];
  lastUpdatedAt?: Date;
};

export type RankingContext = {
  userLocation?: GeoPoint;
  userInterests?: string[];
  preferredCategories?: string[];
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
};

export type RankedResult = {
  entity: RankableEntity;
  finalScore: number;
  breakdown: Record<string, number>;
  explanation: string[];
};

/* -------------------------------------------------------------------------- */
/* WEIGHTS (DYNAMIC TUNABLE)                                                  */
/* -------------------------------------------------------------------------- */

const WEIGHTS = {
  GEO: 0.25,
  TRUST: 0.2,
  QUALITY: 0.2,
  POPULARITY: 0.15,
  FRESHNESS: 0.1,
  PERSONALIZATION: 0.1,
};

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */

const normalize = (
  value: number,
  max = 100
) => Math.min(Math.max(value / max, 0), 1);

const clamp = (v: number) =>
  Math.min(Math.max(v, 0), 1);

const randomSalt = () =>
  crypto.randomBytes(2).readUInt16BE() /
  65535;

/* -------------------------------------------------------------------------- */
/* RANKING ENGINE                                                             */
/* -------------------------------------------------------------------------- */

export class SearchRankingEngine {
  /* ======================================================================== */
  /* MAIN ENTRY                                                               */
  /* ======================================================================== */

  rank(params: {
    entities: RankableEntity[];
    context: RankingContext;
  }): RankedResult[] {
    const scored = params.entities.map((entity) =>
      this.scoreEntity(entity, params.context)
    );

    const diversified =
      this.applyDiversity(scored);

    return diversified.sort(
      (a, b) => b.finalScore - a.finalScore
    );
  }

  /* ======================================================================== */
  /* SCORING                                                                  */
  /* ======================================================================== */

  private scoreEntity(
    entity: RankableEntity,
    context: RankingContext
  ): RankedResult {
    const breakdown: Record<string, number> =
      {};

    /* ---------------- GEO ---------------- */

    let geoScore = 0.5;
    if (
      entity.location &&
      context.userLocation
    ) {
      const distance = haversineKm(
        entity.location,
        context.userLocation
      );
      geoScore = clamp(1 - distance / 20);
    }
    breakdown.geo = geoScore;

    /* ---------------- TRUST -------------- */

    const trustScore = normalize(
      entity.trustScore ?? 40
    );
    breakdown.trust = trustScore;

    /* ---------------- QUALITY ------------ */

    const qualityScore = normalize(
      entity.qualityScore ?? 50
    );
    breakdown.quality = qualityScore;

    /* ---------------- POPULARITY --------- */

    const popularityScore = normalize(
      entity.popularityScore ?? 30
    );
    breakdown.popularity = popularityScore;

    /* ---------------- FRESHNESS ---------- */

    let freshnessScore =
      normalize(entity.freshnessScore ?? 50);

    if (entity.lastUpdatedAt) {
      const ageHours =
        (Date.now() -
          entity.lastUpdatedAt.getTime()) /
        3600000;
      freshnessScore = clamp(
        1 - ageHours / 72
      );
    }
    breakdown.freshness = freshnessScore;

    /* ---------------- PERSONALIZATION ---- */

    const personalizationScore =
      this.computePersonalization(
        entity,
        context
      );
    breakdown.personalization =
      personalizationScore;

    /* ---------------- FAIRNESS NOISE ----- */

    const noise = randomSalt() * 0.03;

    /* ---------------- FINAL SCORE -------- */

    const finalScore =
      geoScore * WEIGHTS.GEO +
      trustScore * WEIGHTS.TRUST +
      qualityScore * WEIGHTS.QUALITY +
      popularityScore *
        WEIGHTS.POPULARITY +
      freshnessScore *
        WEIGHTS.FRESHNESS +
      personalizationScore *
        WEIGHTS.PERSONALIZATION +
      noise;

    return {
      entity,
      finalScore,
      breakdown,
      explanation: this.buildExplanation(
        breakdown,
        finalScore
      ),
    };
  }

  /* ======================================================================== */
  /* PERSONALIZATION ENGINE                                                   */
  /* ======================================================================== */

  private computePersonalization(
    entity: RankableEntity,
    context: RankingContext
  ): number {
    let score = 0.3;

    if (
      context.preferredCategories?.includes(
        entity.category ?? ""
      )
    ) {
      score += 0.3;
    }

    if (
      context.userInterests &&
      entity.tags
    ) {
      const matches = entity.tags.filter(
        (t) =>
          context.userInterests?.includes(t)
      ).length;

      score += Math.min(matches * 0.1, 0.3);
    }

    return clamp(score);
  }

  /* ======================================================================== */
  /* DIVERSITY / FAIRNESS                                                     */
  /* ======================================================================== */

  private applyDiversity(
    results: RankedResult[]
  ): RankedResult[] {
    const bucket = new Map<
      string,
      RankedResult[]
    >();

    for (const r of results) {
      const key = r.entity.category ?? "other";
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key)!.push(r);
    }

    const balanced: RankedResult[] = [];
    const maxPerCategory = 3;

    for (const group of bucket.values()) {
      group
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, maxPerCategory)
        .forEach((r) => balanced.push(r));
    }

    return balanced;
  }

  /* ======================================================================== */
  /* EXPLAINABILITY                                                           */
  /* ======================================================================== */

  private buildExplanation(
    breakdown: Record<string, number>,
    finalScore: number
  ): string[] {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(
      breakdown
    )) {
      lines.push(
        `${key.toUpperCase()}: ${(value * 100).toFixed(
          1
        )}%`
      );
    }

    lines.push(
      `FINAL SCORE: ${(finalScore * 100).toFixed(
        1
      )}%`
    );

    return lines;
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON                                                                  */
/* -------------------------------------------------------------------------- */

export const searchRankingEngine =
  new SearchRankingEngine();
