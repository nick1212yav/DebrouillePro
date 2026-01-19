/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE — MODULE TEMPLATE POLICY (OFFICIAL & FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  Chemin : backend/src/modules/_template/_template.policy.ts                */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE ABSOLU                                                               */
/*  - AUCUN module ne décide seul                                             */
/*  - Toute action passe par :                                                */
/*      • Access Engine                                                       */
/*      • Trust Engine                                                        */
/*  - Décisions explicables, traçables, auditables                             */
/*                                                                            */
/*  SORTIES POSSIBLES                                                         */
/*  - ALLOW                                                                   */
/*  - DENY                                                                    */
/*  - LIMIT                                                                   */
/*  - RECOMMEND                                                               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  TemplateAction,
  TemplateAccessContext,
} from "./_template.types";

/* -------------------------------------------------------------------------- */
/* IMPORTS CORE (OFFICIELS)                                                   */
/* -------------------------------------------------------------------------- */

import { AccessEngine } from "../../core/access/access.engine";
import { TrustService } from "../../core/trust/trust.service";

/* -------------------------------------------------------------------------- */
/* TYPES DE DÉCISION                                                          */
/* -------------------------------------------------------------------------- */

export type PolicyDecision =
  | { decision: "ALLOW" }
  | { decision: "DENY"; reason: string }
  | { decision: "LIMIT"; reason: string }
  | { decision: "RECOMMEND"; recommendation: string };

/* -------------------------------------------------------------------------- */
/* POLICY — CLASSE FINALE                                                     */
/* -------------------------------------------------------------------------- */

export class TemplatePolicy {
  /* ------------------------------------------------------------------------ */
  /* POINT D’ENTRÉE UNIQUE                                                    */
  /* ------------------------------------------------------------------------ */

  static async evaluate(
    context: TemplateAccessContext
  ): Promise<PolicyDecision> {
    const { actorId, accountType, role, action, trustScore } = context;

    /* ---------------------------------------------------------------------- */
    /* 1. VÉRIFICATION D’ACCÈS (STRUCTUREL)                                   */
    /* ---------------------------------------------------------------------- */

    const access = await AccessEngine.evaluate({
      actorId,
      accountType,
      role,
      module: context.module,
      action,
    });

    if (access.decision !== "ALLOW") {
      return {
        decision: access.decision,
        reason: access.reason || "Access engine restriction",
      };
    }

    /* ---------------------------------------------------------------------- */
    /* 2. VÉRIFICATION DE CONFIANCE                                           */
    /* ---------------------------------------------------------------------- */

    const trust = await TrustService.evaluate({
      actorId,
      module: context.module,
      action,
      currentScore: trustScore,
    });

    if (trust.decision === "DENY") {
      return {
        decision: "DENY",
        reason: "Insufficient trust level",
      };
    }

    if (trust.decision === "LIMIT") {
      return {
        decision: "LIMIT",
        reason: "Trust level requires limitation",
      };
    }

    if (trust.decision === "RECOMMEND") {
      return {
        decision: "RECOMMEND",
        recommendation: trust.recommendation || "Increase trust score",
      };
    }

    /* ---------------------------------------------------------------------- */
    /* 3. RÈGLES MÉTIER GÉNÉRIQUES (TEMPLATE)                                 */
    /* ---------------------------------------------------------------------- */

    // Exemple : publication réservée aux comptes vérifiés
    if (action === "PUBLISH" && trustScore !== undefined && trustScore < 40) {
      return {
        decision: "DENY",
        reason: "Publishing requires higher trust score",
      };
    }

    /* ---------------------------------------------------------------------- */
    /* 4. AUTORISATION FINALE                                                 */
    /* ---------------------------------------------------------------------- */

    return { decision: "ALLOW" };
  }
}
