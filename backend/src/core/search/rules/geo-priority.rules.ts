/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — GEO PRIORITY RULES ENGINE                              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/rules/geo-priority.rules.ts                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Prioriser intelligemment la proximité                                  */
/*   - Adapter le ranking au contexte local                                   */
/*   - Optimiser l’utilité réelle                                              */
/*   - Réduire la latence perçue                                                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type GeoPrecision =
  | "EXACT"
  | "NEAR"
  | "CITY"
  | "REGION"
  | "COUNTRY"
  | "GLOBAL";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoContext {
  userLocation?: GeoPoint;
  entityLocation?: GeoPoint;

  cityMatch?: boolean;
  countryMatch?: boolean;

  networkLatencyMs?: number;
  localAvailability?: boolean;

  populationDensity?: number; // habitants/km2
  infrastructureScore?: number; // 0–100
}

export interface GeoPriorityResult {
  distanceKm?: number;
  precision: GeoPrecision;
  geoBoostFactor: number;
  latencyPenaltyFactor: number;
  localityScore: number;
  explain: string[];
  fingerprint: string;
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_KM = 6371;
const MAX_GEO_BOOST = 2.2;
const MIN_GEO_BOOST = 0.6;

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(value, max));
}

function fingerprint(input: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

/* -------------------------------------------------------------------------- */
/* GEO MATH                                                                   */
/* -------------------------------------------------------------------------- */

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distance haversine précise (km).
 */
function computeDistanceKm(
  a: GeoPoint,
  b: GeoPoint
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.asin(Math.sqrt(h))
  );
}

/* -------------------------------------------------------------------------- */
/* PRECISION RESOLUTION                                                       */
/* -------------------------------------------------------------------------- */

function resolvePrecision(
  distanceKm?: number,
  ctx?: GeoContext
): GeoPrecision {
  if (distanceKm === undefined)
    return "GLOBAL";

  if (distanceKm < 1) return "EXACT";
  if (distanceKm < 10) return "NEAR";
  if (distanceKm < 80) return "CITY";
  if (distanceKm < 500) return "REGION";

  if (ctx?.countryMatch) return "COUNTRY";
  return "GLOBAL";
}

/* -------------------------------------------------------------------------- */
/* BOOST COMPUTATION                                                          */
/* -------------------------------------------------------------------------- */

function computeGeoBoost(
  distanceKm?: number,
  ctx?: GeoContext,
  explain: string[] = []
): number {
  let boost = 1;

  if (distanceKm !== undefined) {
    if (distanceKm < 1) {
      boost += 1.1;
      explain.push("Ultra-local proximity");
    } else if (distanceKm < 10) {
      boost += 0.7;
      explain.push("Near proximity");
    } else if (distanceKm < 80) {
      boost += 0.4;
      explain.push("City-level proximity");
    } else if (distanceKm < 500) {
      boost += 0.1;
      explain.push("Regional proximity");
    }
  }

  if (ctx?.localAvailability) {
    boost += 0.3;
    explain.push("Locally available");
  }

  if (ctx?.cityMatch) {
    boost += 0.2;
    explain.push("Same city");
  }

  if (ctx?.populationDensity && ctx.populationDensity > 3000) {
    boost += 0.15;
    explain.push("High urban density");
  }

  if (
    ctx?.infrastructureScore &&
    ctx.infrastructureScore > 70
  ) {
    boost += 0.1;
    explain.push("Strong local infrastructure");
  }

  return clamp(boost, MIN_GEO_BOOST, MAX_GEO_BOOST);
}

/* -------------------------------------------------------------------------- */
/* LATENCY PENALTY                                                            */
/* -------------------------------------------------------------------------- */

function computeLatencyPenalty(
  latencyMs?: number,
  explain: string[] = []
): number {
  if (!latencyMs) return 1;

  if (latencyMs < 80) {
    explain.push("Low latency");
    return 1;
  }

  if (latencyMs < 200) {
    explain.push("Moderate latency");
    return 0.95;
  }

  if (latencyMs < 500) {
    explain.push("High latency");
    return 0.85;
  }

  explain.push("Very high latency");
  return 0.7;
}

/* -------------------------------------------------------------------------- */
/* LOCALITY SCORE                                                             */
/* -------------------------------------------------------------------------- */

function computeLocalityScore(
  distanceKm?: number,
  ctx?: GeoContext
): number {
  let score = 0;

  if (distanceKm !== undefined) {
    score += clamp(100 - distanceKm, 0, 60);
  }

  if (ctx?.cityMatch) score += 10;
  if (ctx?.countryMatch) score += 5;
  if (ctx?.localAvailability) score += 10;

  if (ctx?.populationDensity) {
    score += clamp(
      ctx.populationDensity / 500,
      0,
      10
    );
  }

  return clamp(Math.round(score), 0, 100);
}

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export class GeoPriorityRulesEngine {
  static evaluate(input: {
    geoContext?: GeoContext;
  }): GeoPriorityResult {
    const explain: string[] = [];

    const ctx = input.geoContext;

    let distanceKm: number | undefined;

    if (
      ctx?.userLocation &&
      ctx?.entityLocation
    ) {
      distanceKm = computeDistanceKm(
        ctx.userLocation,
        ctx.entityLocation
      );
    }

    const precision = resolvePrecision(
      distanceKm,
      ctx
    );

    const geoBoostFactor = computeGeoBoost(
      distanceKm,
      ctx,
      explain
    );

    const latencyPenaltyFactor =
      computeLatencyPenalty(
        ctx?.networkLatencyMs,
        explain
      );

    const localityScore = computeLocalityScore(
      distanceKm,
      ctx
    );

    return {
      distanceKm:
        distanceKm !== undefined
          ? Math.round(distanceKm * 100) /
            100
          : undefined,
      precision,
      geoBoostFactor,
      latencyPenaltyFactor,
      localityScore,
      explain,
      fingerprint: fingerprint({
        distanceKm,
        precision,
        ctx,
      }),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* GUARANTEES                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Haversine précis
 * ✔️ Multi-facteurs adaptatifs
 * ✔️ Explainable ranking
 * ✔️ Fonctionne offline
 * ✔️ Zéro dépendance externe
 * ✔️ Edge compatible
 * ✔️ Stable et déterministe
 */
