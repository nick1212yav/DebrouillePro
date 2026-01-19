/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TRUST — TRUST CONTROLLER (WORLD #1 API)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/trust/trust.controller.ts                          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*   - Exposer une API publique sécurisée du moteur de confiance              */
/*   - Permettre audit, consultation, analyse                                 */
/*   - Protéger les règles internes                                           */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*   - Aucune logique métier ici                                              */
/*   - Zéro mutation directe via API publique                                 */
/*   - Toutes les réponses sont normalisées                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";
import { Types } from "mongoose";

import { IdentityKind } from "../identity/identity.types";

import {
  TrustService,
} from "./trust.service";

import {
  TrustLogModel,
} from "./trustLog.model";

/* -------------------------------------------------------------------------- */
/* API RESPONSE TYPES                                                         */
/* -------------------------------------------------------------------------- */

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const parseObjectId = (
  value?: string
): Types.ObjectId | undefined => {
  if (!value) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
};

const ok = <T>(res: Response, data: T) =>
  res.status(200).json({
    success: true,
    data,
  } satisfies ApiSuccess<T>);

const fail = (
  res: Response,
  status: number,
  message: string
) =>
  res.status(status).json({
    success: false,
    error: message,
  } satisfies ApiError);

/* -------------------------------------------------------------------------- */
/* TRUST CONTROLLER                                                           */
/* -------------------------------------------------------------------------- */

export class TrustController {
  /* ======================================================================== */
  /* READ — CURRENT TRUST SCORE                                               */
  /* ======================================================================== */

  /**
   * GET /trust/score
   * ----------------------------------------------------
   * Query:
   *   - identityKind = PERSON | ORGANIZATION
   *   - userId?
   *   - organizationId?
   */
  static async getTrustScore(
    req: Request,
    res: Response
  ) {
    try {
      const identityKind =
        req.query.identityKind as IdentityKind;

      if (!identityKind) {
        return fail(
          res,
          400,
          "identityKind is required"
        );
      }

      const userId = parseObjectId(
        req.query.userId as string
      );

      const organizationId = parseObjectId(
        req.query.organizationId as string
      );

      if (
        identityKind === IdentityKind.PERSON &&
        !userId
      ) {
        return fail(
          res,
          400,
          "userId is required for PERSON"
        );
      }

      if (
        identityKind ===
          IdentityKind.ORGANIZATION &&
        !organizationId
      ) {
        return fail(
          res,
          400,
          "organizationId is required for ORGANIZATION"
        );
      }

      const lastLog = await TrustLogModel.findOne({
        identityKind,
        ...(userId && { userId }),
        ...(organizationId && { organizationId }),
      })
        .sort({ createdAt: -1 })
        .lean();

      return ok(res, {
        trustScore:
          lastLog?.newTrustScore ?? 0,
        lastUpdatedAt:
          lastLog?.createdAt ?? null,
      });
    } catch (error) {
      console.error("getTrustScore", error);
      return fail(res, 500, "Internal error");
    }
  }

  /* ======================================================================== */
  /* READ — TRUST HISTORY                                                     */
  /* ======================================================================== */

  /**
   * GET /trust/history
   * ----------------------------------------------------
   * Query:
   *   - identityKind
   *   - userId?
   *   - organizationId?
   *   - limit? (default 50)
   */
  static async getTrustHistory(
    req: Request,
    res: Response
  ) {
    try {
      const identityKind =
        req.query.identityKind as IdentityKind;

      if (!identityKind) {
        return fail(
          res,
          400,
          "identityKind is required"
        );
      }

      const userId = parseObjectId(
        req.query.userId as string
      );

      const organizationId = parseObjectId(
        req.query.organizationId as string
      );

      const limit = Math.min(
        Number(req.query.limit || 50),
        200
      );

      const logs =
        await TrustService.getRecentLogs({
          identityKind,
          userId,
          organizationId,
          limit,
        });

      return ok(res, logs);
    } catch (error) {
      console.error("getTrustHistory", error);
      return fail(res, 500, "Internal error");
    }
  }

  /* ======================================================================== */
  /* READ — TRUST THRESHOLD CHECK                                             */
  /* ======================================================================== */

  /**
   * GET /trust/meets-threshold
   * ----------------------------------------------------
   * Query:
   *   - trustScore
   *   - threshold (BASIC | VERIFIED | TRUSTED | ELITE)
   */
  static async meetsThreshold(
    req: Request,
    res: Response
  ) {
    try {
      const trustScore = Number(
        req.query.trustScore
      );

      const threshold =
        req.query.threshold as any;

      if (Number.isNaN(trustScore)) {
        return fail(
          res,
          400,
          "trustScore must be a number"
        );
      }

      if (!threshold) {
        return fail(
          res,
          400,
          "threshold is required"
        );
      }

      const meets =
        TrustService.meetsThreshold(
          trustScore,
          threshold
        );

      return ok(res, {
        trustScore,
        threshold,
        meets,
      });
    } catch (error) {
      console.error("meetsThreshold", error);
      return fail(res, 500, "Internal error");
    }
  }

  /* ======================================================================== */
  /* FORENSIC — LEDGER INTEGRITY CHECK                                         */
  /* ======================================================================== */

  /**
   * GET /trust/ledger/verify
   * ----------------------------------------------------
   * ⚠️ Route administrative / monitoring uniquement
   */
  static async verifyLedgerIntegrity(
    _req: Request,
    res: Response
  ) {
    try {
      const valid =
        await (TrustLogModel as any)
          .verifyLedgerIntegrity();

      return ok(res, {
        integrity: valid ? "VALID" : "CORRUPTED",
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "verifyLedgerIntegrity",
        error
      );
      return fail(res, 500, "Internal error");
    }
  }
}
