/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE CORE — TRUST CONTEXT (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/context/trust.context.ts                           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exprimer le niveau de confiance runtime d’une identité                 */
/*   - Alimenter les moteurs Access, Pay, IA                                  */
/*   - Centraliser les signaux de risque                                      */
/*                                                                            */
/*  CE CONTEXTE NE CONTIENT JAMAIS :                                           */
/*   - Données personnelles sensibles                                        */
/*   - Décisions métier définitives                                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* TRUST LEVEL                                                                */
/* -------------------------------------------------------------------------- */

export type TrustLevel =
  | "UNKNOWN"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

/* -------------------------------------------------------------------------- */
/* TRUST FLAGS                                                                */
/* -------------------------------------------------------------------------- */

export type TrustFlag =
  | "NEW_IDENTITY"
  | "UNVERIFIED"
  | "SUSPICIOUS_ACTIVITY"
  | "MULTIPLE_FAILED_LOGINS"
  | "GEO_ANOMALY"
  | "DEVICE_ANOMALY"
  | "MANUAL_REVIEW"
  | "BLACKLISTED";

/* -------------------------------------------------------------------------- */
/* TRUST CONTEXT                                                              */
/* -------------------------------------------------------------------------- */

export interface TrustContext {
  /** Normalized trust score 0 → 100 */
  readonly score: number;

  /** Qualitative trust level */
  readonly level: TrustLevel;

  /** Risk flags */
  readonly flags: ReadonlyArray<TrustFlag>;

  /** Last evaluation timestamp */
  readonly evaluatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* DEFAULT CONTEXT                                                            */
/* -------------------------------------------------------------------------- */

export const DEFAULT_TRUST_CONTEXT: TrustContext =
  Object.freeze({
    score: 0,
    level: "UNKNOWN",
    flags: Object.freeze([]),
    evaluatedAt: new Date(0),
  });

/* -------------------------------------------------------------------------- */
/* NORMALIZATION                                                              */
/* -------------------------------------------------------------------------- */

const clampScore = (score: number): number =>
  Math.max(0, Math.min(100, score));

const inferLevel = (
  score: number
): TrustLevel => {
  if (score >= 90) return "HIGH";
  if (score >= 70) return "MEDIUM";
  if (score >= 40) return "LOW";
  if (score >= 10) return "UNKNOWN";
  return "CRITICAL";
};

/* -------------------------------------------------------------------------- */
/* FACTORY                                                                    */
/* -------------------------------------------------------------------------- */

export interface CreateTrustContextParams {
  score: number;
  flags?: TrustFlag[];
  evaluatedAt?: Date;
}

export const createTrustContext = (
  params: CreateTrustContextParams
): TrustContext => {
  const normalizedScore = clampScore(
    params.score
  );

  const flags = Object.freeze(
    params.flags ?? []
  );

  return Object.freeze({
    score: normalizedScore,
    level: inferLevel(normalizedScore),
    flags,
    evaluatedAt:
      params.evaluatedAt ?? new Date(),
  });
};

/* -------------------------------------------------------------------------- */
/* DERIVED HELPERS                                                            */
/* -------------------------------------------------------------------------- */

export const isHighTrust = (
  ctx: TrustContext
): boolean => ctx.level === "HIGH";

export const isCriticalRisk = (
  ctx: TrustContext
): boolean =>
  ctx.level === "CRITICAL" ||
  ctx.flags.includes("BLACKLISTED");

export const hasRiskFlag = (
  ctx: TrustContext,
  flag: TrustFlag
): boolean => ctx.flags.includes(flag);

/* -------------------------------------------------------------------------- */
/* SERIALIZATION                                                              */
/* -------------------------------------------------------------------------- */

export const serializeTrustContext = (
  ctx: TrustContext
): Record<string, unknown> => ({
  score: ctx.score,
  level: ctx.level,
  flags: [...ctx.flags],
  evaluatedAt: ctx.evaluatedAt.toISOString(),
});

/* -------------------------------------------------------------------------- */
/* PHILOSOPHIE                                                                */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Contexte IMMUTABLE.
 * ✔️ Aucun calcul métier lourd ici.
 * ✔️ Conçu pour être recalculé fréquemment.
 * ✔️ Compatible scoring IA futur.
 */
