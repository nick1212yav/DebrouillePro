/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRUST — TRUST RULES ENGINE (WORLD #1)                           */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/trust/trust.rules.ts                                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION :                                                                 */
/*   - Gouverner l’évolution du TrustScore universel                           */
/*   - Garantir équité, stabilité, explicabilité                               */
/*   - Résister aux fraudes, bots, manipulations                               */
/*   - Fournir une base scientifique exploitable par l’IA                      */
/*                                                                            */
/*  PHILOSOPHIE :                                                             */
/*   - Trust ≠ Popularité                                                     */
/*   - Trust = Cohérence + Historique + Impact réel                            */
/*   - La confiance se mérite lentement                                       */
/*   - Elle se perd plus vite que ce qu’elle se gagne                          */
/*   - Toute variation est explicable humainement                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  TrustEventType,
  TrustImpactType,
} from "./trustLog.model";

/* -------------------------------------------------------------------------- */
/* GLOBAL CONSTANTS                                                           */
/* -------------------------------------------------------------------------- */

export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_MAX = 100;

/**
 * Demi-vie du trust (stabilité temporelle).
 * Plus le score est élevé, plus il est difficile de monter.
 */
export const TRUST_INERTIA_COEFFICIENT = 0.92;

/**
 * Facteur de pénalité asymétrique :
 * perdre est plus rapide que gagner.
 */
export const NEGATIVE_BIAS = 1.4;

/**
 * Protection contre inflation artificielle.
 */
export const MAX_DELTA_PER_EVENT = 12;

/* -------------------------------------------------------------------------- */
/* TRUST LEVELS (CONTRACT PUBLIC)                                             */
/* -------------------------------------------------------------------------- */

export const TRUST_THRESHOLDS = {
  GUEST: 0,
  BASIC: 10,
  VERIFIED: 30,
  TRUSTED: 60,
  ELITE: 85,
} as const;

export type TrustLevel =
  | "GUEST"
  | "BASIC"
  | "VERIFIED"
  | "TRUSTED"
  | "ELITE";

/* -------------------------------------------------------------------------- */
/* BASE VALUES PER EVENT                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Valeurs de base conservatrices.
 * Elles sont volontairement faibles pour empêcher inflation.
 */
export const BASE_TRUST_VALUES: Record<
  TrustEventType,
  number
> = {
  ACCOUNT_CREATED: 4,
  IDENTITY_VERIFIED: 18,

  TRANSACTION_SUCCESS: 2,
  TRANSACTION_FAILED: -6,

  CONTENT_VALIDATED: 3,
  CONTENT_REPORTED: -4,

  DELIVERY_COMPLETED: 5,
  DELIVERY_DISPUTED: -9,

  JOB_COMPLETED: 6,
  JOB_DISPUTED: -12,

  ADMIN_OVERRIDE: 0,
  AI_ADJUSTMENT: 0,
};

/* -------------------------------------------------------------------------- */
/* MODIFIERS                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Anti-spam / Anti-farming
 * Réduit l’impact lorsque le même événement est répété trop souvent.
 */
export function repetitionModifier(
  occurrences: number
): number {
  if (occurrences <= 1) return 1;
  if (occurrences <= 3) return 0.65;
  if (occurrences <= 6) return 0.35;
  return 0.15;
}

/**
 * Gravité contextuelle.
 * Permet aux modules métiers de pondérer.
 */
export function severityModifier(
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
): number {
  switch (severity) {
    case "LOW":
      return 0.5;
    case "MEDIUM":
      return 1;
    case "HIGH":
      return 1.6;
    case "CRITICAL":
      return 2.2;
    default:
      return 1;
  }
}

/**
 * Inertie : plus le score est élevé, plus les gains sont freinés.
 */
export function inertiaModifier(
  currentScore: number
): number {
  const normalized = currentScore / TRUST_SCORE_MAX;
  return 1 - normalized * (1 - TRUST_INERTIA_COEFFICIENT);
}

/**
 * Anti-burst : empêche des variations extrêmes sur un seul événement.
 */
export function capDelta(delta: number): number {
  if (delta > MAX_DELTA_PER_EVENT)
    return MAX_DELTA_PER_EVENT;
  if (delta < -MAX_DELTA_PER_EVENT)
    return -MAX_DELTA_PER_EVENT;
  return delta;
}

/* -------------------------------------------------------------------------- */
/* CORE COMPUTATION                                                           */
/* -------------------------------------------------------------------------- */

export interface TrustComputationParams {
  currentScore: number;
  eventType: TrustEventType;
  impactType: TrustImpactType;
  occurrences?: number;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/**
 * Calculer l'impact réel d'un événement de confiance.
 */
export function computeTrustDelta(
  params: TrustComputationParams
): {
  delta: number;
  raw: number;
  modifiers: {
    repetition: number;
    severity: number;
    inertia: number;
    negativeBias: number;
  };
} {
  const base =
    BASE_TRUST_VALUES[params.eventType] || 0;

  const repetition = repetitionModifier(
    params.occurrences || 1
  );

  const severity = severityModifier(
    params.severity || "MEDIUM"
  );

  const inertia = inertiaModifier(
    params.currentScore
  );

  const negativeBias =
    params.impactType === TrustImpactType.DECREASE
      ? NEGATIVE_BIAS
      : 1;

  let raw =
    base *
    repetition *
    severity *
    inertia *
    negativeBias;

  raw =
    params.impactType === TrustImpactType.DECREASE
      ? -Math.abs(raw)
      : Math.abs(raw);

  const delta = capDelta(raw);

  return {
    delta,
    raw,
    modifiers: {
      repetition,
      severity,
      inertia,
      negativeBias,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* SCORE SAFETY                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Clamp du score final.
 */
export function clampTrustScore(
  score: number
): number {
  if (score < TRUST_SCORE_MIN)
    return TRUST_SCORE_MIN;
  if (score > TRUST_SCORE_MAX)
    return TRUST_SCORE_MAX;
  return Math.round(score);
}

/**
 * Appliquer une variation sécurisée.
 */
export function applyTrustDelta(
  currentScore: number,
  delta: number
): number {
  return clampTrustScore(currentScore + delta);
}

/* -------------------------------------------------------------------------- */
/* TRUST LEVEL RESOLUTION                                                     */
/* -------------------------------------------------------------------------- */

export function resolveTrustLevel(
  score: number
): TrustLevel {
  if (score >= TRUST_THRESHOLDS.ELITE)
    return "ELITE";
  if (score >= TRUST_THRESHOLDS.TRUSTED)
    return "TRUSTED";
  if (score >= TRUST_THRESHOLDS.VERIFIED)
    return "VERIFIED";
  if (score >= TRUST_THRESHOLDS.BASIC)
    return "BASIC";
  return "GUEST";
}

/* -------------------------------------------------------------------------- */
/* HUMAN EXPLANATION ENGINE                                                   */
/* -------------------------------------------------------------------------- */

export function explainTrustChange(params: {
  eventType: TrustEventType;
  delta: number;
  levelBefore: TrustLevel;
  levelAfter: TrustLevel;
}): string {
  const direction =
    params.delta > 0
      ? "augmenté"
      : params.delta < 0
        ? "diminué"
        : "resté stable";

  const levelChange =
    params.levelBefore !== params.levelAfter
      ? ` (niveau ${params.levelBefore} → ${params.levelAfter})`
      : "";

  return `Votre niveau de confiance a ${direction} suite à : ${params.eventType}${levelChange}.`;
}

/* -------------------------------------------------------------------------- */
/* AUDIT HELPERS                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Diagnostic complet exploitable par IA / Audit.
 */
export function debugTrustComputation(
  params: TrustComputationParams
) {
  const result = computeTrustDelta(params);
  return {
    input: params,
    output: result,
    projectedScore: clampTrustScore(
      params.currentScore + result.delta
    ),
    projectedLevel: resolveTrustLevel(
      clampTrustScore(
        params.currentScore + result.delta
      )
    ),
    computedAt: new Date(),
  };
}

/* -------------------------------------------------------------------------- */
/* GUARANTEES                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Anti-fraude
 * ✔️ Anti-inflation
 * ✔️ Explicable humainement
 * ✔️ Stable dans le temps
 * ✔️ Résilient aux abus
 * ✔️ Compatible IA
 * ✔️ Gouvernance mondiale prête
 *
 * Trust is not a feature.
 * Trust is the backbone of civilization.
 */
