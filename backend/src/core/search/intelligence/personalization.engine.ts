/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE SEARCH — PERSONALIZATION ENGINE (HUMAN INTELLIGENCE LAYER)     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/search/intelligence/personalization.engine.ts      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Adapter dynamiquement les résultats à chaque individu                  */
/*   - Intégrer comportement, culture, géographie, confiance                  */
/*   - Anticiper les besoins futurs                                           */
/*   - Maximiser pertinence et impact humain                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { IdentityContext } from "../../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface UserBehaviorProfile {
  preferredCategories: string[];
  frequentLocations: string[];
  activeHours: number[]; // 0–23
  devicePreference?: "mobile" | "desktop";
  language?: string;
  conversionRate?: number;
}

export interface PersonalizationContext {
  identity?: IdentityContext;
  geo?: {
    country?: string;
    city?: string;
  };
  device?: "mobile" | "desktop" | "offline";
  behavior?: UserBehaviorProfile;
  now?: Date;
}

export interface PersonalizedScore {
  boost: number;        // -50 → +50
  reasons: string[];
}

/* -------------------------------------------------------------------------- */
/* SIGNAL EXTRACTION                                                          */
/* -------------------------------------------------------------------------- */

function extractSignals(
  ctx: PersonalizationContext
) {
  const hour =
    ctx.now?.getHours() ?? new Date().getHours();

  return {
    hour,
    trust: ctx.identity?.trustScore ?? 0,
    city: ctx.geo?.city,
    country: ctx.geo?.country,
    device: ctx.device,
    behavior: ctx.behavior,
  };
}

/* -------------------------------------------------------------------------- */
/* BEHAVIOR BOOST                                                             */
/* -------------------------------------------------------------------------- */

function behaviorBoost(
  category: string,
  behavior?: UserBehaviorProfile
): PersonalizedScore {
  if (!behavior) {
    return { boost: 0, reasons: [] };
  }

  if (
    behavior.preferredCategories.includes(
      category
    )
  ) {
    return {
      boost: 15,
      reasons: ["Preferred category affinity"],
    };
  }

  return { boost: 0, reasons: [] };
}

/* -------------------------------------------------------------------------- */
/* GEO BOOST                                                                  */
/* -------------------------------------------------------------------------- */

function geoBoost(
  itemCity?: string,
  ctxCity?: string
): PersonalizedScore {
  if (!itemCity || !ctxCity) {
    return { boost: 0, reasons: [] };
  }

  if (itemCity === ctxCity) {
    return {
      boost: 20,
      reasons: ["Local proximity match"],
    };
  }

  return { boost: 0, reasons: [] };
}

/* -------------------------------------------------------------------------- */
/* TRUST BOOST                                                                */
/* -------------------------------------------------------------------------- */

function trustBoost(
  userTrust: number,
  itemTrust?: number
): PersonalizedScore {
  if (!itemTrust) {
    return { boost: 0, reasons: [] };
  }

  if (itemTrust >= userTrust) {
    return {
      boost: 10,
      reasons: ["Trust alignment"],
    };
  }

  return { boost: -5, reasons: ["Trust mismatch"] };
}

/* -------------------------------------------------------------------------- */
/* TIME INTELLIGENCE                                                          */
/* -------------------------------------------------------------------------- */

function timeBoost(
  activeHours: number[] | undefined,
  currentHour: number
): PersonalizedScore {
  if (!activeHours) {
    return { boost: 0, reasons: [] };
  }

  if (activeHours.includes(currentHour)) {
    return {
      boost: 8,
      reasons: ["Active hour relevance"],
    };
  }

  return { boost: -3, reasons: ["Low activity hour"] };
}

/* -------------------------------------------------------------------------- */
/* DEVICE OPTIMIZATION                                                        */
/* -------------------------------------------------------------------------- */

function deviceBoost(
  preferred?: string,
  actual?: string
): PersonalizedScore {
  if (!preferred || !actual) {
    return { boost: 0, reasons: [] };
  }

  if (preferred === actual) {
    return {
      boost: 5,
      reasons: ["Device affinity"],
    };
  }

  return { boost: -2, reasons: ["Device mismatch"] };
}

/* -------------------------------------------------------------------------- */
/* PERSONALIZATION ENGINE                                                     */
/* -------------------------------------------------------------------------- */

export class PersonalizationEngine {
  static personalize(params: {
    baseScore: number;
    category: string;
    itemCity?: string;
    itemTrust?: number;
    context: PersonalizationContext;
  }): {
    finalScore: number;
    reasons: string[];
  } {
    const signals = extractSignals(params.context);

    const boosts: PersonalizedScore[] = [
      behaviorBoost(
        params.category,
        signals.behavior
      ),
      geoBoost(params.itemCity, signals.city),
      trustBoost(signals.trust, params.itemTrust),
      timeBoost(
        signals.behavior?.activeHours,
        signals.hour
      ),
      deviceBoost(
        signals.behavior?.devicePreference,
        signals.device
      ),
    ];

    const totalBoost = boosts.reduce(
      (sum, b) => sum + b.boost,
      0
    );

    const reasons = boosts.flatMap(
      (b) => b.reasons
    );

    return {
      finalScore: Math.max(
        0,
        params.baseScore + totalBoost
      ),
      reasons,
    };
  }
}
