/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — FRAUD HOOKS (AUTONOMOUS REACTION ENGINE)                  */
/*  File: backend/src/core/pay/fraud.hooks.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Réagir automatiquement aux événements antifraude                        */
/*  - Déclencher protections, escalades, IA, audit                             */
/*  - Orchestrer Trust, Pay, Notification, Justice                             */
/*  - Garantir non-blocage et idempotence                                      */
/*                                                                            */
/*  PHILOSOPHIE :                                                             */
/*  - L’humain reste souverain                                                 */
/*  - L’IA accélère, jamais ne confisque                                       */
/*  - La sécurité est proactive                                                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { fraudEventBus } from "./fraud.events";

import {
  FraudDecisionResult,
  FraudSignal,
  FraudScore,
  FraudCaseFile,
} from "./fraud.types";

/* CORE INTEGRATIONS */
import { TrustService } from "../trust/trust.service";
import { TrackingService } from "../tracking/tracking.service";

/* OPTIONAL FUTURE INTEGRATIONS (plug & play) */
// import { WalletService } from "../pay/wallet.service";
// import { NotificationService } from "../notification/notification.service";
// import { JusticeService } from "../justice/justice.service";

/* -------------------------------------------------------------------------- */
/* SAFETY WRAPPER                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Garantit :
 * - jamais bloquant
 * - aucune exception propagée
 * - logs sécurisés
 */
const safe =
  <T>(
    handler: (payload: T) => Promise<void>
  ) =>
  async (payload: T) => {
    try {
      await handler(payload);
    } catch (error) {
      console.error("🔥 FraudHook error", error);
    }
  };

/* -------------------------------------------------------------------------- */
/* INITIALIZATION                                                             */
/* -------------------------------------------------------------------------- */

export function initializeFraudHooks(): void {
  registerSignalHooks();
  registerScoreHooks();
  registerDecisionHooks();
  registerCaseHooks();
  registerInvestigationHooks();

  console.log("🧠 Fraud hooks initialized");
}

/* -------------------------------------------------------------------------- */
/* SIGNAL HOOKS                                                               */
/* -------------------------------------------------------------------------- */

function registerSignalHooks() {
  fraudEventBus.onSafe(
    "fraud.signal.detected",
    safe(async ({ identityId, signal }) => {
      /* -------------------------------------------------------------- */
      /* AUDIT                                                          */
      /* -------------------------------------------------------------- */

      await TrackingService.system(
        {},
        {
          action: "fraud.signal.detected",
          outcome: "SUCCESS",
          message: `Signal ${signal.type} detected for ${identityId}`,
          metadata: signal,
        }
      );

      /* -------------------------------------------------------------- */
      /* TRUST EARLY WARNING                                            */
      /* -------------------------------------------------------------- */

      if (signal.severity === "HIGH") {
        await TrustService.applyEvent({
          identityKind: "PERSON" as any,
          userId: signal.identityObjectId as any,
          eventType: "AI_ADJUSTMENT" as any,
          source: "AI" as any,
          severity: "HIGH",
          reason: "High risk fraud signal detected",
          metadata: signal,
        });
      }

      /* -------------------------------------------------------------- */
      /* FUTURE: NOTIFICATION / ALERT                                  */
      /* -------------------------------------------------------------- */
      // NotificationService.alertSecurity(...)
    })
  );
}

/* -------------------------------------------------------------------------- */
/* SCORE HOOKS                                                                */
/* -------------------------------------------------------------------------- */

function registerScoreHooks() {
  fraudEventBus.onSafe(
    "fraud.score.updated",
    safe(async ({ identityId, score }) => {
      /* -------------------------------------------------------------- */
      /* OBSERVABILITY                                                  */
      /* -------------------------------------------------------------- */

      await TrackingService.system(
        {},
        {
          action: "fraud.score.updated",
          outcome: "SUCCESS",
          message: `Fraud score updated for ${identityId}`,
          metadata: score,
        }
      );

      /* -------------------------------------------------------------- */
      /* AUTOMATIC PREVENTION                                           */
      /* -------------------------------------------------------------- */

      if (score.globalScore >= 80) {
        // Exemple futur :
        // WalletService.freezeByIdentity(identityId)
        console.warn(
          "🚨 High fraud score detected, preventive actions recommended",
          score
        );
      }
    })
  );
}

/* -------------------------------------------------------------------------- */
/* DECISION HOOKS                                                             */
/* -------------------------------------------------------------------------- */

function registerDecisionHooks() {
  fraudEventBus.onSafe(
    "fraud.decision.made",
    safe(async ({ identityId, decision }) => {
      /* -------------------------------------------------------------- */
      /* AUDIT                                                          */
      /* -------------------------------------------------------------- */

      await TrackingService.system(
        {},
        {
          action: "fraud.decision.made",
          outcome: "SUCCESS",
          message: `Decision ${decision.action} for ${identityId}`,
          metadata: decision,
        }
      );

      /* -------------------------------------------------------------- */
      /* DECISION AUTOMATION                                            */
      /* -------------------------------------------------------------- */

      switch (decision.action) {
        case "ALLOW":
          break;

        case "MONITOR":
          // Intensifier surveillance IA
          console.info("👁️ Monitoring intensified", identityId);
          break;

        case "LIMIT":
          // Exemple futur :
          // WalletService.applyLimits(identityId)
          console.warn("⚠️ Limits suggested", identityId);
          break;

        case "BLOCK":
          // Exemple futur :
          // WalletService.freezeByIdentity(identityId)
          console.error("⛔ Identity should be blocked", identityId);
          break;

        case "ESCALATE":
          // Exemple futur :
          // JusticeService.openCase(...)
          console.error("⚖️ Escalation required", identityId);
          break;
      }
    })
  );
}

/* -------------------------------------------------------------------------- */
/* CASE HOOKS                                                                 */
/* -------------------------------------------------------------------------- */

function registerCaseHooks() {
  fraudEventBus.onSafe(
    "fraud.case.created",
    safe(async ({ caseFile }) => {
      /* -------------------------------------------------------------- */
      /* TRACEABILITY                                                   */
      /* -------------------------------------------------------------- */

      await TrackingService.system(
        {},
        {
          action: "fraud.case.created",
          outcome: "SUCCESS",
          message: `Fraud case created ${caseFile.caseId}`,
          metadata: caseFile,
        }
      );

      /* -------------------------------------------------------------- */
      /* HUMAN WORKFLOW TRIGGER                                         */
      /* -------------------------------------------------------------- */

      console.warn(
        "📁 Fraud case created. Human review required.",
        caseFile
      );

      // NotificationService.notifyAdmins(...)
    })
  );
}

/* -------------------------------------------------------------------------- */
/* INVESTIGATION HOOKS                                                        */
/* -------------------------------------------------------------------------- */

function registerInvestigationHooks() {
  fraudEventBus.onSafe(
    "fraud.investigation.opened",
    safe(async ({ investigation, identityId }) => {
      await TrackingService.system(
        {},
        {
          action: "fraud.investigation.opened",
          outcome: "SUCCESS",
          message: `Investigation opened for ${identityId}`,
          metadata: investigation,
        }
      );
    })
  );

  fraudEventBus.onSafe(
    "fraud.investigation.closed",
    safe(async ({ investigationId, resolution, identityId }) => {
      await TrackingService.system(
        {},
        {
          action: "fraud.investigation.closed",
          outcome: "SUCCESS",
          message: `Investigation closed for ${identityId}`,
          metadata: {
            investigationId,
            resolution,
          },
        }
      );

      /* -------------------------------------------------------------- */
      /* POST-RESOLUTION ACTIONS                                        */
      /* -------------------------------------------------------------- */

      if (resolution.verdict === "FRAUD_CONFIRMED") {
        console.error(
          "🚫 Fraud confirmed. Permanent actions recommended.",
          identityId
        );
      }

      if (resolution.verdict === "FALSE_POSITIVE") {
        console.info(
          "✅ False positive resolved. Trust restoration possible.",
          identityId
        );
      }
    })
  );
}
