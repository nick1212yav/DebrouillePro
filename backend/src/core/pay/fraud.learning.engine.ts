/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD LEARNING ENGINE (WORLD #1 INTELLIGENCE CORE)        */
/*  File: backend/src/core/pay/fraud.learning.engine.ts                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION :                                                                 */
/*  - Observer tous les événements financiers                                 */
/*  - Construire une mémoire comportementale                                  */
/*  - Détecter anomalies et dérives                                            */
/*  - Générer des recommandations explicables                                  */
/*  - Alimenter FraudRulesEngine (sans jamais décider à sa place)             */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*  - Aucune action automatique destructive                                   */
/*  - L’IA recommande, l’humain/règle décide                                   */
/*  - Tous les calculs sont auditables                                         */
/*  - Résilience offline / edge                                                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type FraudSignalType =
  | "VELOCITY_SPIKE"
  | "AMOUNT_ANOMALY"
  | "GEO_DRIFT"
  | "DEVICE_SHIFT"
  | "TIME_PATTERN_BREAK"
  | "TRUST_INCONSISTENCY"
  | "BLACKLIST_CORRELATION";

export type FraudLearningConfidence =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface FraudObservation {
  identityId: string;
  walletId?: string;

  amount?: number;
  currency?: string;
  country?: string;
  deviceFingerprint?: string;

  trustScore?: number;
  timestamp: Date;
}

export interface FraudSignal {
  id: string;
  identityId: string;
  type: FraudSignalType;
  confidence: FraudLearningConfidence;
  score: number; // 0 → 100

  reason: string;
  evidence: Record<string, unknown>;

  detectedAt: Date;
}

export interface FraudRecommendation {
  identityId: string;

  suggestedDecision:
    | "MONITOR"
    | "LIMIT"
    | "ESCALATE"
    | "FREEZE";

  confidence: FraudLearningConfidence;
  justification: string;

  signals: FraudSignal[];

  generatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL MEMORY STRUCTURES (IN-MEMORY CACHE)                               */
/* -------------------------------------------------------------------------- */

/**
 * Historique glissant par identité.
 * Peut être persisté plus tard (Redis / ClickHouse / BigQuery).
 */
interface IdentityMemory {
  amounts: number[];
  countries: Set<string>;
  devices: Set<string>;
  timestamps: number[];
  trustScores: number[];
}

const MEMORY: Map<string, IdentityMemory> = new Map();

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
/* -------------------------------------------------------------------------- */

const MEMORY_LIMIT = 200;
const VELOCITY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */

function hash(value?: string): string | undefined {
  if (!value) return undefined;
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return (
    values.reduce((a, b) => a + b, 0) /
    values.length
  );
}

function deviation(values: number[], value: number) {
  const avg = average(values);
  if (avg === 0) return 0;
  return Math.abs(value - avg) / avg;
}

/* -------------------------------------------------------------------------- */
/* FRAUD LEARNING ENGINE                                                      */
/* -------------------------------------------------------------------------- */

export class FraudLearningEngine {
  /* ======================================================================== */
  /* INGESTION                                                                */
  /* ======================================================================== */

  /**
   * Observer un événement financier.
   */
  static observe(
    observation: FraudObservation
  ): void {
    const key = observation.identityId;

    let memory = MEMORY.get(key);
    if (!memory) {
      memory = {
        amounts: [],
        countries: new Set(),
        devices: new Set(),
        timestamps: [],
        trustScores: [],
      };
      MEMORY.set(key, memory);
    }

    if (observation.amount) {
      memory.amounts.push(observation.amount);
    }

    if (observation.country) {
      memory.countries.add(observation.country);
    }

    if (observation.deviceFingerprint) {
      const deviceHash = hash(
        observation.deviceFingerprint
      );
      if (deviceHash) {
        memory.devices.add(deviceHash);
      }
    }

    memory.timestamps.push(
      observation.timestamp.getTime()
    );

    if (observation.trustScore !== undefined) {
      memory.trustScores.push(
        observation.trustScore
      );
    }

    // Trim memory
    memory.amounts = memory.amounts.slice(
      -MEMORY_LIMIT
    );
    memory.timestamps = memory.timestamps.slice(
      -MEMORY_LIMIT
    );
    memory.trustScores = memory.trustScores.slice(
      -MEMORY_LIMIT
    );
  }

  /* ======================================================================== */
  /* ANALYSIS                                                                 */
  /* ======================================================================== */

  /**
   * Analyser une identité et générer des signaux.
   */
  static analyze(
    identityId: string
  ): FraudSignal[] {
    const memory = MEMORY.get(identityId);
    if (!memory) return [];

    const signals: FraudSignal[] = [];
    const now = Date.now();

    /* -------------------------------------------------------------------- */
    /* VELOCITY SPIKE                                                       */
    /* -------------------------------------------------------------------- */

    const recentOps = memory.timestamps.filter(
      (t) => now - t < VELOCITY_WINDOW_MS
    );

    if (recentOps.length >= 10) {
      signals.push(
        this.signal(
          identityId,
          "VELOCITY_SPIKE",
          85,
          "Pic inhabituel d'opérations sur une courte période",
          {
            count: recentOps.length,
            windowMinutes: 10,
          }
        )
      );
    }

    /* -------------------------------------------------------------------- */
    /* AMOUNT ANOMALY                                                       */
    /* -------------------------------------------------------------------- */

    const lastAmount =
      memory.amounts[memory.amounts.length - 1];

    if (
      lastAmount &&
      memory.amounts.length > 10
    ) {
      const dev = deviation(
        memory.amounts.slice(0, -1),
        lastAmount
      );

      if (dev > 3) {
        signals.push(
          this.signal(
            identityId,
            "AMOUNT_ANOMALY",
            Math.min(100, dev * 30),
            "Montant fortement divergent du comportement historique",
            {
              deviationRatio: dev,
              lastAmount,
            }
          )
        );
      }
    }

    /* -------------------------------------------------------------------- */
    /* GEO DRIFT                                                             */
    /* -------------------------------------------------------------------- */

    if (memory.countries.size >= 3) {
      signals.push(
        this.signal(
          identityId,
          "GEO_DRIFT",
          70,
          "Multiples pays détectés sur une courte période",
          {
            countries: Array.from(memory.countries),
          }
        )
      );
    }

    /* -------------------------------------------------------------------- */
    /* DEVICE SHIFT                                                          */
    /* -------------------------------------------------------------------- */

    if (memory.devices.size >= 4) {
      signals.push(
        this.signal(
          identityId,
          "DEVICE_SHIFT",
          75,
          "Changements fréquents d'appareils",
          {
            devicesCount: memory.devices.size,
          }
        )
      );
    }

    /* -------------------------------------------------------------------- */
    /* TRUST INCONSISTENCY                                                   */
    /* -------------------------------------------------------------------- */

    const lastTrust =
      memory.trustScores[
        memory.trustScores.length - 1
      ];

    if (
      lastTrust !== undefined &&
      lastTrust < 20 &&
      lastAmount &&
      lastAmount > 1000
    ) {
      signals.push(
        this.signal(
          identityId,
          "TRUST_INCONSISTENCY",
          90,
          "Montant élevé malgré un faible TrustScore",
          {
            trustScore: lastTrust,
            amount: lastAmount,
          }
        )
      );
    }

    return signals;
  }

  /* ======================================================================== */
  /* RECOMMENDATION                                                           */
  /* ======================================================================== */

  /**
   * Transformer les signaux en recommandation humaine.
   */
  static recommend(
    identityId: string
  ): FraudRecommendation | null {
    const signals = this.analyze(identityId);
    if (!signals.length) return null;

    const maxScore = Math.max(
      ...signals.map((s) => s.score)
    );

    let decision:
      | "MONITOR"
      | "LIMIT"
      | "ESCALATE"
      | "FREEZE" = "MONITOR";

    if (maxScore >= 90) decision = "FREEZE";
    else if (maxScore >= 75) decision = "ESCALATE";
    else if (maxScore >= 60) decision = "LIMIT";

    const confidence =
      maxScore >= 90
        ? "CRITICAL"
        : maxScore >= 75
        ? "HIGH"
        : maxScore >= 50
        ? "MEDIUM"
        : "LOW";

    return {
      identityId,
      suggestedDecision: decision,
      confidence,
      justification: `Recommandation basée sur ${signals.length} signaux cumulés`,
      signals,
      generatedAt: new Date(),
    };
  }

  /* ======================================================================== */
  /* INTERNAL SIGNAL BUILDER                                                  */
  /* ======================================================================== */

  private static signal(
    identityId: string,
    type: FraudSignalType,
    score: number,
    reason: string,
    evidence: Record<string, unknown>
  ): FraudSignal {
    const confidence =
      score >= 90
        ? "CRITICAL"
        : score >= 75
        ? "HIGH"
        : score >= 50
        ? "MEDIUM"
        : "LOW";

    return {
      id: crypto.randomUUID(),
      identityId,
      type,
      confidence,
      score,
      reason,
      evidence,
      detectedAt: new Date(),
    };
  }
}
