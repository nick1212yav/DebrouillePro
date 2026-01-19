/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD SERVICE (REAL-TIME ORCHESTRATOR)                    */
/*  File: backend/src/core/pay/fraud.service.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Collecter signaux antifraude                                            */
/*  - Agréger scores multi-sources                                            */
/*  - Décider (ALLOW / REVIEW / BLOCK / ESCALATE)                             */
/*  - Expliquer chaque décision                                               */
/*  - Émettre événements & dossiers légaux                                    */
/*                                                                            */
/*  PRINCIPES NON NÉGOCIABLES :                                                */
/*  - Une seule vérité antifraude                                             */
/*  - Zéro décision opaque                                                    */
/*  - Traçabilité totale                                                      */
/*  - Résilience maximale                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";
import { EventEmitter } from "events";

import {
  FraudSignal,
  FraudSignalType,
  FraudRiskLevel,
  FraudScore,
  FraudDecision,
  FraudDecisionResult,
  FraudDecisionExplanation,
  FraudCaseFile,
  FraudInvestigation,
  FraudResolution,
  ExternalFraudAssessmentRequest,
  ExternalFraudAssessmentResponse,
} from "./fraud.types";

/* -------------------------------------------------------------------------- */
/* INTERNAL EVENT BUS                                                         */
/* -------------------------------------------------------------------------- */

class FraudEventBus extends EventEmitter {
  emitSafe(event: string, payload: unknown) {
    try {
      this.emit(event, payload);
    } catch (err) {
      console.error("FraudEventBus error", err);
    }
  }
}

export const fraudEventBus = new FraudEventBus();

/* -------------------------------------------------------------------------- */
/* INTERNAL MEMORY STORES (PLUGGABLE DB LATER)                                 */
/* -------------------------------------------------------------------------- */

const signalStore = new Map<string, FraudSignal[]>();
const scoreStore = new Map<string, FraudScore>();
const caseStore = new Map<string, FraudCaseFile>();

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

const generateId = (prefix: string) =>
  `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

const now = () => new Date();

/* Convert severity → numeric weight */
const riskWeight = (level: FraudRiskLevel): number => {
  switch (level) {
    case "NONE":
      return 0;
    case "LOW":
      return 10;
    case "MEDIUM":
      return 30;
    case "HIGH":
      return 60;
    case "CRITICAL":
      return 90;
    default:
      return 0;
  }
};

/* -------------------------------------------------------------------------- */
/* FRAUD SERVICE                                                              */
/* -------------------------------------------------------------------------- */

export class FraudService {
  /* ======================================================================== */
  /* SIGNAL INGESTION                                                         */
  /* ======================================================================== */

  /**
   * Enregistrer un signal antifraude brut.
   */
  static ingestSignal(identityId: string, signal: FraudSignal): void {
    const existing = signalStore.get(identityId) || [];
    existing.push(signal);
    signalStore.set(identityId, existing);

    fraudEventBus.emitSafe("fraud.signal.detected", {
      identityId,
      signal,
    });
  }

  /* ======================================================================== */
  /* SCORE ENGINE                                                             */
  /* ======================================================================== */

  /**
   * Calculer un score agrégé multi-signaux.
   */
  static computeScore(identityId: string): FraudScore {
    const signals = signalStore.get(identityId) || [];

    if (!signals.length) {
      const emptyScore: FraudScore = {
        value: 0,
        level: "NONE",
        confidence: 1,
        computedAt: now(),
        contributors: [],
      };
      scoreStore.set(identityId, emptyScore);
      return emptyScore;
    }

    let weightedSum = 0;
    let confidenceSum = 0;

    for (const s of signals) {
      weightedSum += riskWeight(s.severity) * s.confidence;
      confidenceSum += s.confidence;
    }

    const normalized =
      confidenceSum > 0
        ? Math.min(100, weightedSum / confidenceSum)
        : 0;

    const level: FraudRiskLevel =
      normalized >= 80
        ? "CRITICAL"
        : normalized >= 60
        ? "HIGH"
        : normalized >= 30
        ? "MEDIUM"
        : normalized > 0
        ? "LOW"
        : "NONE";

    const score: FraudScore = {
      value: Math.round(normalized),
      level,
      confidence: Math.min(1, confidenceSum / signals.length),
      computedAt: now(),
      contributors: signals.map((s) => s.type),
    };

    scoreStore.set(identityId, score);

    fraudEventBus.emitSafe("fraud.score.updated", {
      identityId,
      score,
    });

    return score;
  }

  /* ======================================================================== */
  /* DECISION ENGINE                                                          */
  /* ======================================================================== */

  /**
   * Produire une décision explicable.
   */
  static decide(identityId: string): FraudDecisionResult {
    const score = this.computeScore(identityId);
    const signals = signalStore.get(identityId) || [];

    let decision: FraudDecision = "ALLOW";

    if (score.level === "MEDIUM") decision = "CHALLENGE";
    if (score.level === "HIGH") decision = "REVIEW";
    if (score.level === "CRITICAL") decision = "BLOCK";

    const explanation: FraudDecisionExplanation = {
      summary: `Risk level ${score.level} with score ${score.value}`,
      mainFactors: signals.map(
        (s) => `${s.type} (${s.severity})`
      ),
      signals,
      recommendedActions:
        decision === "BLOCK"
          ? ["Freeze wallet", "Open investigation"]
          : decision === "REVIEW"
          ? ["Manual review", "Request verification"]
          : [],
    };

    const result: FraudDecisionResult = {
      decision,
      score,
      explanation,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes TTL
    };

    fraudEventBus.emitSafe("fraud.decision.made", {
      identityId,
      decision: result,
    });

    if (decision === "BLOCK") {
      this.openCase(identityId, result);
    }

    return result;
  }

  /* ======================================================================== */
  /* CASE MANAGEMENT                                                          */
  /* ======================================================================== */

  /**
   * Ouvrir automatiquement un dossier légal.
   */
  static openCase(
    identityId: string,
    decision: FraudDecisionResult
  ): FraudCaseFile {
    const caseId = generateId("CASE");

    const caseFile: FraudCaseFile = {
      caseId,
      identityType: "PERSON",
      identityId,
      createdAt: now(),
      updatedAt: now(),
      riskHistory: [decision.score],
      investigations: [],
      evidences: [],
      legalHold: decision.decision === "BLOCK",
    };

    caseStore.set(caseId, caseFile);

    fraudEventBus.emitSafe("fraud.case.created", {
      caseFile,
    });

    return caseFile;
  }

  /**
   * Ajouter une investigation humaine / IA.
   */
  static openInvestigation(
    caseId: string,
    signals: FraudSignal[]
  ): FraudInvestigation {
    const caseFile = caseStore.get(caseId);
    if (!caseFile) {
      throw new Error("Fraud case not found");
    }

    const investigation: FraudInvestigation = {
      investigationId: generateId("INV"),
      createdAt: now(),
      status: "OPEN",
      signals,
      decisions: [],
    };

    caseFile.investigations.push(investigation);
    caseFile.updatedAt = now();

    fraudEventBus.emitSafe("fraud.investigation.opened", {
      investigation,
      identityId: caseFile.identityId,
    });

    return investigation;
  }

  /**
   * Clôturer une investigation.
   */
  static closeInvestigation(params: {
    caseId: string;
    investigationId: string;
    resolution: FraudResolution;
    notes?: string;
  }): void {
    const caseFile = caseStore.get(params.caseId);
    if (!caseFile) return;

    const inv = caseFile.investigations.find(
      (i) => i.investigationId === params.investigationId
    );
    if (!inv) return;

    inv.status = "RESOLVED";
    inv.resolution = params.resolution;
    inv.closedAt = now();
    inv.notes = params.notes;

    caseFile.updatedAt = now();

    fraudEventBus.emitSafe("fraud.investigation.closed", {
      investigationId: inv.investigationId,
      resolution: params.resolution,
      identityId: caseFile.identityId,
    });
  }

  /* ======================================================================== */
  /* EXTERNAL API (PARTNERS / BANKS / REGULATORS)                              */
  /* ======================================================================== */

  /**
   * API standardisée d’évaluation externe.
   */
  static assessExternal(
    request: ExternalFraudAssessmentRequest
  ): ExternalFraudAssessmentResponse {
    // Inject minimal signal from external request
    this.ingestSignal(request.identityId, {
      type: "AI_ALERT",
      severity: "LOW",
      confidence: 0.3,
      source: "EXTERNAL",
      detectedAt: now(),
      description: "External assessment request",
      rawEvidence: request,
    });

    const decision = this.decide(request.identityId);

    return {
      requestId: request.requestId,
      decision: decision.decision,
      score: decision.score,
      explanation: decision.explanation,
      expiresAt: decision.expiresAt,
    };
  }

  /* ======================================================================== */
  /* READ MODE (OBSERVABILITY / DASHBOARD)                                     */
  /* ======================================================================== */

  static getSignals(identityId: string): FraudSignal[] {
    return signalStore.get(identityId) || [];
  }

  static getScore(identityId: string): FraudScore | undefined {
    return scoreStore.get(identityId);
  }

  static getCase(caseId: string): FraudCaseFile | undefined {
    return caseStore.get(caseId);
  }

  static listCases(): FraudCaseFile[] {
    return Array.from(caseStore.values());
  }
}
