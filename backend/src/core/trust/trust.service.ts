/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRUST — TRUST SERVICE (WORLD #1 ENGINE)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/trust/trust.service.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION :                                                                 */
/*   - Orchestrer toute évolution du TrustScore                               */
/*   - Appliquer les règles canoniques                                        */
/*   - Garantir auditabilité, atomicité, explicabilité                        */
/*   - Servir de socle à Access, IA, Search, Pay, Justice                      */
/*                                                                            */
/*  GARANTIES :                                                               */
/*   - Une seule source de vérité                                             */
/*   - Aucune mutation sans log                                               */
/*   - Aucune dérive silencieuse                                              */
/*   - Résultat déterministe et explicable                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types, ClientSession, startSession } from "mongoose";

import { IdentityKind } from "../identity/identity.types";
import { UserModel } from "../identity/user.model";
import { OrganizationModel } from "../identity/organization.model";

import {
  TrustLogModel,
  TrustEventType,
  TrustSource,
  TrustImpactType,
  ITrustLog,
} from "./trustLog.model";

import {
  computeTrustDelta,
  applyTrustDelta,
  resolveTrustLevel,
  explainTrustChange,
  debugTrustComputation,
} from "./trust.rules";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type TrustEventInput = {
  identityKind: IdentityKind;
  userId?: Types.ObjectId;
  organizationId?: Types.ObjectId;

  eventType: TrustEventType;
  source: TrustSource;

  /**
   * Contexte d'évaluation
   */
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  occurrences?: number;

  /**
   * Justification humaine / métier
   */
  reason?: string;

  /**
   * Métadonnées libres (audit, IA, modules)
   */
  metadata?: Record<string, unknown>;

  /**
   * Mode simulation (aucune écriture)
   */
  dryRun?: boolean;
};

export type TrustApplyResult = {
  log?: ITrustLog;
  previousScore: number;
  newScore: number;
  delta: number;
  levelBefore: string;
  levelAfter: string;
  explanation: string;
  debug: ReturnType<typeof debugTrustComputation>;
};

/* -------------------------------------------------------------------------- */
/* TRUST SERVICE                                                              */
/* -------------------------------------------------------------------------- */

export class TrustService {
  /* ======================================================================== */
  /* MAIN ENTRY — SINGLE SOURCE OF TRUTH                                      */
  /* ======================================================================== */

  /**
   * Appliquer un événement de confiance.
   * 👉 Point d’entrée UNIQUE du moteur Trust.
   */
  static async applyEvent(
    input: TrustEventInput
  ): Promise<TrustApplyResult> {
    const session: ClientSession = await startSession();
    session.startTransaction();

    try {
      /* ------------------------------------------------------------------ */
      /* LOAD TARGET                                                        */
      /* ------------------------------------------------------------------ */

      const {
        identityKind,
        userId,
        organizationId,
      } = input;

      let currentTrustScore = 0;

      if (
        identityKind === IdentityKind.PERSON &&
        userId
      ) {
        const user = await UserModel.findById(
          userId
        ).session(session);

        if (!user) {
          throw new Error("User not found");
        }

        currentTrustScore = user.trustScore || 0;
      }

      if (
        identityKind ===
          IdentityKind.ORGANIZATION &&
        organizationId
      ) {
        const org =
          await OrganizationModel.findById(
            organizationId
          ).session(session);

        if (!org) {
          throw new Error("Organization not found");
        }

        currentTrustScore = org.trustScore || 0;
      }

      /* ------------------------------------------------------------------ */
      /* COMPUTE DELTA                                                      */
      /* ------------------------------------------------------------------ */

      const impactType =
        input.eventType.includes("FAILED") ||
        input.eventType.includes("DISPUTED")
          ? TrustImpactType.DECREASE
          : TrustImpactType.INCREASE;

      const computation = computeTrustDelta({
        currentScore: currentTrustScore,
        eventType: input.eventType,
        impactType,
        severity: input.severity,
        occurrences: input.occurrences,
      });

      const newTrustScore = applyTrustDelta(
        currentTrustScore,
        computation.delta
      );

      const levelBefore =
        resolveTrustLevel(currentTrustScore);

      const levelAfter =
        resolveTrustLevel(newTrustScore);

      const explanation =
        input.reason ||
        explainTrustChange({
          eventType: input.eventType,
          delta: computation.delta,
          levelBefore,
          levelAfter,
        });

      const debug = debugTrustComputation({
        currentScore: currentTrustScore,
        eventType: input.eventType,
        impactType,
        severity: input.severity,
        occurrences: input.occurrences,
      });

      /* ------------------------------------------------------------------ */
      /* DRY RUN MODE (SIMULATION)                                           */
      /* ------------------------------------------------------------------ */

      if (input.dryRun) {
        await session.abortTransaction();
        session.endSession();

        return {
          previousScore: currentTrustScore,
          newScore: newTrustScore,
          delta: computation.delta,
          levelBefore,
          levelAfter,
          explanation,
          debug,
        };
      }

      /* ------------------------------------------------------------------ */
      /* WRITE TRUST LOG (IMMUTABLE)                                         */
      /* ------------------------------------------------------------------ */

      const log = new TrustLogModel({
        identityKind,
        userId,
        organizationId,

        eventType: input.eventType,
        source: input.source,

        impactType:
          computation.delta > 0
            ? TrustImpactType.INCREASE
            : computation.delta < 0
            ? TrustImpactType.DECREASE
            : TrustImpactType.NEUTRAL,

        impactValue: Math.abs(computation.delta),

        previousTrustScore: currentTrustScore,
        newTrustScore,

        reason: explanation,
        metadata: {
          ...input.metadata,
          modifiers: computation.modifiers,
          debug,
        },
      });

      await log.save({ session });

      /* ------------------------------------------------------------------ */
      /* UPDATE TARGET SCORE (ATOMIC)                                        */
      /* ------------------------------------------------------------------ */

      if (
        identityKind === IdentityKind.PERSON &&
        userId
      ) {
        await UserModel.updateOne(
          { _id: userId },
          { $set: { trustScore: newTrustScore } },
          { session }
        );
      }

      if (
        identityKind ===
          IdentityKind.ORGANIZATION &&
        organizationId
      ) {
        await OrganizationModel.updateOne(
          { _id: organizationId },
          { $set: { trustScore: newTrustScore } },
          { session }
        );
      }

      /* ------------------------------------------------------------------ */
      /* COMMIT                                                              */
      /* ------------------------------------------------------------------ */

      await session.commitTransaction();
      session.endSession();

      return {
        log,
        previousScore: currentTrustScore,
        newScore: newTrustScore,
        delta: computation.delta,
        levelBefore,
        levelAfter,
        explanation,
        debug,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /* ======================================================================== */
  /* READ APIS                                                                */
  /* ======================================================================== */

  /**
   * Récupérer les derniers événements Trust.
   */
  static async getRecentLogs(params: {
    identityKind: IdentityKind;
    userId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
    limit?: number;
  }): Promise<ITrustLog[]> {
    const query: any = {
      identityKind: params.identityKind,
    };

    if (params.userId) query.userId = params.userId;
    if (params.organizationId)
      query.organizationId =
        params.organizationId;

    return TrustLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(params.limit || 50)
      .exec();
  }

  /**
   * Calculer un résumé statistique de confiance.
   */
  static async getTrustSummary(params: {
    identityKind: IdentityKind;
    userId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
  }) {
    const logs = await this.getRecentLogs({
      ...params,
      limit: 200,
    });

    const deltas = logs.map(
      (l) =>
        (l.newTrustScore || 0) -
        (l.previousTrustScore || 0)
    );

    return {
      totalEvents: logs.length,
      positiveEvents: deltas.filter((d) => d > 0).length,
      negativeEvents: deltas.filter((d) => d < 0).length,
      neutralEvents: deltas.filter((d) => d === 0).length,
      averageDelta:
        deltas.reduce((a, b) => a + b, 0) /
        (deltas.length || 1),
      lastUpdatedAt: logs[0]?.createdAt,
    };
  }

  /* ======================================================================== */
  /* VALIDATION / SAFETY                                                     */
  /* ======================================================================== */

  /**
   * Vérifier si une identité existe et est active.
   */
  static async validateIdentity(params: {
    identityKind: IdentityKind;
    userId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
  }): Promise<void> {
    if (
      params.identityKind === IdentityKind.PERSON
    ) {
      if (!params.userId)
        throw new Error("userId is required");

      const user = await UserModel.findById(
        params.userId
      );

      if (!user || user.isDeleted) {
        throw new Error("Invalid user identity");
      }
    }

    if (
      params.identityKind ===
      IdentityKind.ORGANIZATION
    ) {
      if (!params.organizationId)
        throw new Error(
          "organizationId is required"
        );

      const org =
        await OrganizationModel.findById(
          params.organizationId
        );

      if (!org || org.isDeleted) {
        throw new Error(
          "Invalid organization identity"
        );
      }
    }
  }
}
