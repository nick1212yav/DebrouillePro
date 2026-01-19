/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — PRIORITY ENGINE (SOVEREIGN DECISION CORE)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/intelligence/priority.engine.ts             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Arbitrer toutes les priorités du système                               */
/*   - Résoudre conflits d'intentions                                         */
/*   - Garantir sécurité, équité, résilience                                  */
/*   - Préserver l'intérêt humain avant l'algorithme                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { IdentityContext } from "../../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type PriorityLevel =
  | "CRITICAL"
  | "HIGH"
  | "NORMAL"
  | "LOW"
  | "BACKGROUND";

export interface PrioritySignal {
  urgency?: number;        // 0–100
  humanImpact?: number;    // 0–100
  trust?: number;          // 0–100
  securityRisk?: number;   // 0–100
  fairnessRisk?: number;   // 0–100
  systemLoad?: number;     // 0–100
}

export interface PriorityDecision {
  level: PriorityLevel;
  score: number;
  reasons: string[];
  throttled?: boolean;
}

/* -------------------------------------------------------------------------- */
/* NORMALIZATION                                                              */
/* -------------------------------------------------------------------------- */

function normalize(value?: number): number {
  if (value === undefined) return 50;
  return Math.max(0, Math.min(100, value));
}

/* -------------------------------------------------------------------------- */
/* WEIGHT MATRIX                                                              */
/* -------------------------------------------------------------------------- */

const WEIGHTS = {
  urgency: 1.4,
  humanImpact: 1.6,
  trust: 1.1,
  securityRisk: -2.0,
  fairnessRisk: -1.3,
  systemLoad: -1.2,
};

/* -------------------------------------------------------------------------- */
/* ETHICAL GUARDRAILS                                                         */
/* -------------------------------------------------------------------------- */

function ethicalOverride(
  signal: PrioritySignal
): string | null {
  if (normalize(signal.securityRisk) > 85) {
    return "SECURITY_RISK_BLOCK";
  }

  if (normalize(signal.fairnessRisk) > 80) {
    return "FAIRNESS_RISK_LIMIT";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* PRIORITY COMPUTATION                                                       */
/* -------------------------------------------------------------------------- */

function computeScore(signal: PrioritySignal): number {
  return (
    normalize(signal.urgency) * WEIGHTS.urgency +
    normalize(signal.humanImpact) *
      WEIGHTS.humanImpact +
    normalize(signal.trust) * WEIGHTS.trust +
    normalize(signal.securityRisk) *
      WEIGHTS.securityRisk +
    normalize(signal.fairnessRisk) *
      WEIGHTS.fairnessRisk +
    normalize(signal.systemLoad) *
      WEIGHTS.systemLoad
  );
}

/* -------------------------------------------------------------------------- */
/* SCORE → LEVEL                                                              */
/* -------------------------------------------------------------------------- */

function resolveLevel(score: number): PriorityLevel {
  if (score > 220) return "CRITICAL";
  if (score > 160) return "HIGH";
  if (score > 90) return "NORMAL";
  if (score > 40) return "LOW";
  return "BACKGROUND";
}

/* -------------------------------------------------------------------------- */
/* THROTTLING ENGINE                                                          */
/* -------------------------------------------------------------------------- */

function shouldThrottle(
  level: PriorityLevel,
  systemLoad?: number
): boolean {
  if (!systemLoad) return false;
  if (systemLoad < 70) return false;

  return level === "LOW" || level === "BACKGROUND";
}

/* -------------------------------------------------------------------------- */
/* PRIORITY ENGINE                                                            */
/* -------------------------------------------------------------------------- */

export class PriorityEngine {
  static decide(params: {
    signal: PrioritySignal;
    identity?: IdentityContext;
  }): PriorityDecision {
    const ethicalBlock = ethicalOverride(
      params.signal
    );

    if (ethicalBlock === "SECURITY_RISK_BLOCK") {
      return {
        level: "BACKGROUND",
        score: 0,
        throttled: true,
        reasons: ["Blocked due to high security risk"],
      };
    }

    const score = computeScore(params.signal);
    const level = resolveLevel(score);

    const throttled = shouldThrottle(
      level,
      params.signal.systemLoad
    );

    const reasons: string[] = [];

    if (params.signal.urgency)
      reasons.push("Urgency signal applied");
    if (params.signal.humanImpact)
      reasons.push("Human impact prioritized");
    if (params.signal.trust)
      reasons.push("Trust-based weighting");
    if (params.signal.securityRisk)
      reasons.push("Security risk evaluated");
    if (params.signal.fairnessRisk)
      reasons.push("Fairness guard applied");
    if (params.signal.systemLoad)
      reasons.push("System load protection");

    if (ethicalBlock === "FAIRNESS_RISK_LIMIT") {
      reasons.push(
        "Fairness risk detected, priority limited"
      );
    }

    if (throttled) {
      reasons.push("System throttling applied");
    }

    return {
      level,
      score,
      throttled,
      reasons,
    };
  }
}
