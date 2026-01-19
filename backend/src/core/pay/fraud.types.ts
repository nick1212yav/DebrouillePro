/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD TYPES (UNIVERSAL CONTRACT)                          */
/*  File: backend/src/core/pay/fraud.types.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Langage commun antifraude mondial                                       */
/*  - Contrats API internes & externes                                        */
/*  - Interface IA explicable                                                 */
/*  - Interopérabilité partenaires                                            */
/*  - Conformité réglementaire                                                */
/*                                                                            */
/*  NE CONTIENT AUCUNE LOGIQUE                                                 */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* CORE IDENTITIES                                                            */
/* -------------------------------------------------------------------------- */

export type FraudIdentityType =
  | "PERSON"
  | "ORGANIZATION"
  | "SYSTEM"
  | "AI"
  | "PARTNER"
  | "REGULATOR";

/* -------------------------------------------------------------------------- */
/* RISK MODEL                                                                 */
/* -------------------------------------------------------------------------- */

export type FraudRiskLevel =
  | "NONE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type FraudRiskSource =
  | "BEHAVIOR"
  | "DEVICE"
  | "NETWORK"
  | "LOCATION"
  | "TRANSACTION"
  | "SOCIAL"
  | "EXTERNAL"
  | "AI";

/* -------------------------------------------------------------------------- */
/* SIGNALS                                                                    */
/* -------------------------------------------------------------------------- */

export type FraudSignalType =
  | "VELOCITY_ANOMALY"
  | "AMOUNT_ANOMALY"
  | "GEO_MISMATCH"
  | "DEVICE_FINGERPRINT_CHANGE"
  | "SIM_SWAP"
  | "VPN_DETECTED"
  | "MULTI_ACCOUNT_PATTERN"
  | "BOT_BEHAVIOR"
  | "SUSPICIOUS_TIME"
  | "BLACKLIST_MATCH"
  | "TRUST_DROP"
  | "AI_ALERT";

export interface FraudSignal {
  type: FraudSignalType;
  severity: FraudRiskLevel;
  confidence: number;     // 0–1
  source: FraudRiskSource;
  description?: string;
  detectedAt: Date;
  rawEvidence?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* SCORE MODEL                                                                */
/* -------------------------------------------------------------------------- */

export interface FraudScore {
  value: number;          // 0–100
  level: FraudRiskLevel;
  confidence: number;     // 0–1
  computedAt: Date;
  contributors: FraudSignalType[];
}

/* -------------------------------------------------------------------------- */
/* DECISION MODEL                                                             */
/* -------------------------------------------------------------------------- */

export type FraudDecision =
  | "ALLOW"
  | "CHALLENGE"
  | "REVIEW"
  | "BLOCK"
  | "ESCALATE";

export interface FraudDecisionExplanation {
  summary: string;
  mainFactors: string[];
  signals: FraudSignal[];
  recommendedActions?: string[];
  regulatorNotes?: string;
}

export interface FraudDecisionResult {
  decision: FraudDecision;
  score: FraudScore;
  explanation: FraudDecisionExplanation;
  expiresAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* INVESTIGATION                                                              */
/* -------------------------------------------------------------------------- */

export type FraudInvestigationStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "ESCALATED"
  | "RESOLVED"
  | "DISMISSED";

export type FraudResolution =
  | "CONFIRMED_FRAUD"
  | "FALSE_POSITIVE"
  | "INCONCLUSIVE"
  | "USER_ERROR"
  | "SYSTEM_ERROR";

export interface FraudInvestigation {
  investigationId: string;
  createdAt: Date;
  status: FraudInvestigationStatus;
  assignedTo?: string;
  signals: FraudSignal[];
  decisions: FraudDecisionResult[];
  resolution?: FraudResolution;
  closedAt?: Date;
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* CASE FILE (LEGAL READY)                                                    */
/* -------------------------------------------------------------------------- */

export interface FraudCaseFile {
  caseId: string;
  identityType: FraudIdentityType;
  identityId: string;

  jurisdiction?: string;
  regulatorReference?: string;

  createdAt: Date;
  updatedAt: Date;

  riskHistory: FraudScore[];
  investigations: FraudInvestigation[];

  evidences: Array<{
    type: string;
    hash: string;
    storageRef: string;
    collectedAt: Date;
  }>;

  legalHold?: boolean;
}

/* -------------------------------------------------------------------------- */
/* EVENT CONTRACT                                                             */
/* -------------------------------------------------------------------------- */

export type FraudEventName =
  | "fraud.signal.detected"
  | "fraud.score.updated"
  | "fraud.decision.made"
  | "fraud.investigation.opened"
  | "fraud.investigation.closed"
  | "fraud.case.created"
  | "fraud.case.updated"
  | "fraud.alert.critical";

export interface FraudEventPayloadMap {
  "fraud.signal.detected": {
    signal: FraudSignal;
    identityId: string;
  };

  "fraud.score.updated": {
    score: FraudScore;
    identityId: string;
  };

  "fraud.decision.made": {
    decision: FraudDecisionResult;
    identityId: string;
  };

  "fraud.investigation.opened": {
    investigation: FraudInvestigation;
    identityId: string;
  };

  "fraud.investigation.closed": {
    investigationId: string;
    resolution: FraudResolution;
    identityId: string;
  };

  "fraud.case.created": {
    caseFile: FraudCaseFile;
  };

  "fraud.case.updated": {
    caseFile: FraudCaseFile;
  };

  "fraud.alert.critical": {
    identityId: string;
    score: FraudScore;
    message: string;
  };
}

/* -------------------------------------------------------------------------- */
/* EXTERNAL API CONTRACT                                                      */
/* -------------------------------------------------------------------------- */

export interface ExternalFraudAssessmentRequest {
  requestId: string;
  identityType: FraudIdentityType;
  identityId: string;

  transactionId?: string;
  amount?: number;
  currency?: string;

  ipAddress?: string;
  deviceFingerprint?: string;
  geo?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  metadata?: Record<string, unknown>;
}

export interface ExternalFraudAssessmentResponse {
  requestId: string;
  decision: FraudDecision;
  score: FraudScore;
  explanation: FraudDecisionExplanation;
  expiresAt?: Date;
}

/* -------------------------------------------------------------------------- */
/* AI INTERFACE CONTRACT                                                      */
/* -------------------------------------------------------------------------- */

export interface AIFraudInsight {
  modelVersion: string;
  generatedAt: Date;
  hypothesis: string;
  confidence: number;
  contributingSignals: FraudSignalType[];
  recommendedAction: FraudDecision;
  ethicalNotes?: string;
}
