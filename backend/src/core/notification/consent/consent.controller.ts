/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CONSENT CONTROLLER (WORLD #1 PUBLIC API)        */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/consent/consent.controller.ts         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Exposer l’API publique du moteur de consentement                         */
/*  - Garantir validation, sécurité et traçabilité                             */
/*  - Servir apps, web, mobile, offline, institutions                          */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*  - Aucune décision métier ici                                              */
/*  - Validation stricte des inputs                                           */
/*  - Zéro fuite de données sensibles                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";

import {
  ConsentService,
} from "./consent.service";

import {
  ConsentChannel,
  ConsentPurpose,
} from "./consent.types";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const badRequest = (
  res: Response,
  message: string
) =>
  res.status(400).json({
    error: "BAD_REQUEST",
    message,
  });

const ok = (res: Response, data: unknown) =>
  res.status(200).json(data);

/* -------------------------------------------------------------------------- */
/* CONSENT CONTROLLER                                                         */
/* -------------------------------------------------------------------------- */

export class ConsentController {
  /* ======================================================================== */
  /* CHECK                                                                    */
  /* ======================================================================== */

  /**
   * Vérifier si un message peut être envoyé.
   * Utilisé par NotificationService, IA, Gateway.
   *
   * POST /consent/check
   */
  static async check(
    req: Request,
    res: Response
  ) {
    const { subject, channel, purpose } =
      req.body ?? {};

    if (!subject || !channel || !purpose) {
      return badRequest(
        res,
        "subject, channel and purpose are required"
      );
    }

    const decision =
      await ConsentService.canSend({
        subject,
        channel,
        purpose,
      });

    return ok(res, decision);
  }

  /* ======================================================================== */
  /* GRANT                                                                    */
  /* ======================================================================== */

  /**
   * Accorder un consentement explicite.
   *
   * POST /consent/grant
   */
  static async grant(
    req: Request,
    res: Response
  ) {
    const {
      subject,
      channel,
      purpose,
      proof,
      expiresAt,
      metadata,
    } = req.body ?? {};

    if (!subject || !channel || !purpose || !proof) {
      return badRequest(
        res,
        "subject, channel, purpose and proof are required"
      );
    }

    const consent =
      await ConsentService.grantConsent({
        subject,
        channel,
        purpose,
        proof,
        expiresAt: expiresAt
          ? new Date(expiresAt)
          : undefined,
        metadata,
      });

    return ok(res, {
      status: "GRANTED",
      consentId: consent.id,
      version: consent.version,
    });
  }

  /* ======================================================================== */
  /* REVOKE                                                                   */
  /* ======================================================================== */

  /**
   * Révoquer un consentement.
   *
   * POST /consent/revoke
   */
  static async revoke(
    req: Request,
    res: Response
  ) {
    const {
      subject,
      channel,
      purpose,
      reason,
    } = req.body ?? {};

    if (!subject || !channel || !purpose) {
      return badRequest(
        res,
        "subject, channel and purpose are required"
      );
    }

    const consent =
      await ConsentService.revokeConsent({
        subject,
        channel,
        purpose,
        reason,
      });

    return ok(res, {
      status: "REVOKED",
      consentId: consent.id,
      version: consent.version,
    });
  }

  /* ======================================================================== */
  /* LEDGER                                                                   */
  /* ======================================================================== */

  /**
   * Rejouer l’historique complet d’un consentement.
   * Usage : audit, plainte, preuve légale.
   *
   * GET /consent/ledger
   */
  static async ledger(
    req: Request,
    res: Response
  ) {
    const { subject, channel, purpose } =
      req.query as any;

    if (!subject || !channel || !purpose) {
      return badRequest(
        res,
        "subject, channel and purpose are required"
      );
    }

    const ledger =
      await ConsentService.getConsentLedger({
        subject,
        channel,
        purpose,
      });

    return ok(res, {
      count: ledger.length,
      ledger,
    });
  }

  /* ======================================================================== */
  /* LEGAL EXPORT                                                             */
  /* ======================================================================== */

  /**
   * Exporter une preuve légale certifiable.
   *
   * GET /consent/export/:consentId
   */
  static async exportProof(
    req: Request,
    res: Response
  ) {
    const { consentId } = req.params;

    if (!consentId) {
      return badRequest(
        res,
        "consentId is required"
      );
    }

    const proof =
      await ConsentService.exportLegalProof({
        consentId,
      });

    return ok(res, proof);
  }
}
