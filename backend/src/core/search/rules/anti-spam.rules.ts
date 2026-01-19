/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — ANTI-SPAM RULES ENGINE                                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/rules/anti-spam.rules.ts                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Détecter comportements abusifs                                         */
/*   - Protéger la qualité des résultats                                      */
/*   - Prévenir scraping, bots, manipulation                                  */
/*   - Fonctionner offline & edge-friendly                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SpamRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface AntiSpamContext {
  requesterId?: string;
  ipAddress?: string;
  userAgent?: string;
  query: string;
  timestamp: number;
  requestCountLastMinute?: number;
  trustScore?: number;
}

export interface SpamEvaluationResult {
  risk: SpamRiskLevel;
  score: number; // 0 → 100
  reasons: string[];
  fingerprint: string;
  block?: boolean;
  throttle?: boolean;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL MEMORY (EDGE SAFE CACHE)                                          */
/* -------------------------------------------------------------------------- */

const fingerprintMemory = new Map<string, number>();

const MAX_MEMORY = 50_000;

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_QUERY_LENGTH = 300;
const BOT_REGEX =
  /bot|crawler|spider|curl|wget|python|scrapy/i;

const REPETITION_THRESHOLD = 5;
const RATE_LIMIT_THRESHOLD = 120; // req/min
const LOW_TRUST_THRESHOLD = 25;

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function fingerprint(ctx: AntiSpamContext): string {
  const base = [
    ctx.ipAddress ?? "unknown",
    ctx.userAgent ?? "unknown",
    normalize(ctx.query),
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(base)
    .digest("hex");
}

function cleanupMemory() {
  if (fingerprintMemory.size <= MAX_MEMORY) return;

  const keys = Array.from(fingerprintMemory.keys()).slice(
    0,
    Math.floor(MAX_MEMORY / 2)
  );

  for (const k of keys) {
    fingerprintMemory.delete(k);
  }
}

/* -------------------------------------------------------------------------- */
/* HEURISTICS                                                                 */
/* -------------------------------------------------------------------------- */

function detectBot(ctx: AntiSpamContext): boolean {
  if (!ctx.userAgent) return true;
  return BOT_REGEX.test(ctx.userAgent);
}

function detectQueryAbuse(query: string): boolean {
  if (!query) return true;
  if (query.length > MAX_QUERY_LENGTH) return true;

  const uniqueRatio =
    new Set(query.split("")).size /
    Math.max(query.length, 1);

  return uniqueRatio < 0.15;
}

function detectRepetition(fp: string): number {
  const count = fingerprintMemory.get(fp) ?? 0;
  fingerprintMemory.set(fp, count + 1);
  return count + 1;
}

/* -------------------------------------------------------------------------- */
/* RISK SCORING                                                               */
/* -------------------------------------------------------------------------- */

function computeRiskScore(
  ctx: AntiSpamContext,
  repetition: number
): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  if (detectBot(ctx)) {
    score += 35;
    reasons.push("Suspicious user-agent detected");
  }

  if (detectQueryAbuse(ctx.query)) {
    score += 25;
    reasons.push("Abnormal query structure");
  }

  if (repetition > REPETITION_THRESHOLD) {
    score += 30;
    reasons.push("Repeated identical queries");
  }

  if (
    ctx.requestCountLastMinute &&
    ctx.requestCountLastMinute >
      RATE_LIMIT_THRESHOLD
  ) {
    score += 40;
    reasons.push("High request rate");
  }

  if (
    ctx.trustScore !== undefined &&
    ctx.trustScore < LOW_TRUST_THRESHOLD
  ) {
    score += 15;
    reasons.push("Low trust profile");
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
}

function mapRisk(score: number): SpamRiskLevel {
  if (score >= 85) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export class AntiSpamRulesEngine {
  static evaluate(
    ctx: AntiSpamContext
  ): SpamEvaluationResult {
    const fp = fingerprint(ctx);

    cleanupMemory();

    const repetition = detectRepetition(fp);

    const { score, reasons } = computeRiskScore(
      ctx,
      repetition
    );

    const risk = mapRisk(score);

    const result: SpamEvaluationResult = {
      risk,
      score,
      reasons,
      fingerprint: fp,
      block: risk === "CRITICAL",
      throttle: risk === "HIGH",
    };

    return result;
  }
}

/* -------------------------------------------------------------------------- */
/* GUARANTEES                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Aucun stockage persistant (edge safe)
 * ✔️ Zéro dépendance externe
 * ✔️ Déterministe
 * ✔️ Résistant aux floods simples
 * ✔️ Compatible offline / local
 * ✔️ Sécurité progressive (score-based)
 */
