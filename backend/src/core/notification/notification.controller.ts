/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — NOTIFICATION CONTROLLER (WORLD #1)              */
/*  File: backend/src/core/notification/notification.controller.ts           */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*  - Exposer l’API publique de notification                                  */
/*  - Garantir sécurité, validation, idempotence                              */
/*  - Normaliser les réponses HTTP                                            */
/*  - Préparer analytics, audit, IA                                           */
/*                                                                            */
/*  GARANTIES :                                                               */
/*  - Aucune logique métier ici                                               */
/*  - Validation stricte des entrées                                          */
/*  - Compatible Gateway / Access / Observability                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Request, Response } from "express";
import { Types } from "mongoose";

import { NotificationService } from "./notification.service";
import {
  NotificationRequest,
} from "./notification.types";

import {
  ok,
  error as httpError,
} from "../../shared/httpResponse";

import { logger } from "../../shared/logger";

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Validation minimale du contrat NotificationRequest.
 * (Validation lourde possible via zod / joi plus tard)
 */
const validateNotificationRequest = (
  payload: any
): payload is NotificationRequest => {
  if (!payload) return false;
  if (!payload.intent) return false;
  if (!payload.target) return false;
  if (!payload.content) return false;
  if (!payload.priority) return false;

  return true;
};

/**
 * Extraction safe de l'id Mongo.
 */
const parseObjectId = (
  value: string | undefined
): Types.ObjectId | null => {
  if (!value) return null;
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
};

/* -------------------------------------------------------------------------- */
/* CONTROLLER                                                                 */
/* -------------------------------------------------------------------------- */

export class NotificationController {
  /* ======================================================================== */
  /* CREATE & DISPATCH                                                        */
  /* ======================================================================== */

  /**
   * POST /notifications
   * Créer et dispatcher une notification.
   */
  static async dispatch(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const payload = req.body;

      if (!validateNotificationRequest(payload)) {
        return httpError(res, {
          statusCode: 400,
          code: "INVALID_NOTIFICATION_REQUEST",
          message:
            "Invalid notification payload structure",
          requestId:
            req.gatewayContext?.requestId,
        });
      }

      const notification =
        await NotificationService.dispatch(
          payload
        );

      logger.info("NOTIFICATION_DISPATCHED", {
        notificationId: notification._id,
        intent: payload.intent,
        target: payload.target,
        requestId:
          req.gatewayContext?.requestId,
      });

      return ok(res, {
        notificationId: notification._id,
        status: notification.globalStatus,
        channels: notification.resolvedChannels,
      });
    } catch (error: any) {
      logger.error("NOTIFICATION_DISPATCH_FAILED", {
        error: error?.message,
        requestId:
          req.gatewayContext?.requestId,
      });

      return httpError(res, {
        statusCode: 500,
        code: "NOTIFICATION_DISPATCH_FAILED",
        message:
          error?.message ??
          "Unable to dispatch notification",
        requestId:
          req.gatewayContext?.requestId,
      });
    }
  }

  /* ======================================================================== */
  /* GET BY ID                                                                */
  /* ======================================================================== */

  /**
   * GET /notifications/:id
   * Récupérer une notification par id.
   */
  static async getById(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const id = parseObjectId(req.params.id);

      if (!id) {
        return httpError(res, {
          statusCode: 400,
          code: "INVALID_NOTIFICATION_ID",
          message: "Invalid notification id",
          requestId:
            req.gatewayContext?.requestId,
        });
      }

      const notification =
        await NotificationService.getById(id);

      if (!notification) {
        return httpError(res, {
          statusCode: 404,
          code: "NOTIFICATION_NOT_FOUND",
          message: "Notification not found",
          requestId:
            req.gatewayContext?.requestId,
        });
      }

      return ok(res, notification);
    } catch (error: any) {
      logger.error("NOTIFICATION_GET_FAILED", {
        error: error?.message,
        requestId:
          req.gatewayContext?.requestId,
      });

      return httpError(res, {
        statusCode: 500,
        code: "NOTIFICATION_GET_FAILED",
        message:
          error?.message ??
          "Unable to retrieve notification",
        requestId:
          req.gatewayContext?.requestId,
      });
    }
  }

  /* ======================================================================== */
  /* LIST BY TARGET                                                           */
  /* ======================================================================== */

  /**
   * GET /notifications
   * Lister les notifications par target.
   */
  static async listByTarget(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const target = req.query.target;

      if (!target) {
        return httpError(res, {
          statusCode: 400,
          code: "TARGET_REQUIRED",
          message: "Target is required",
          requestId:
            req.gatewayContext?.requestId,
        });
      }

      const limit = Number(req.query.limit) || 50;

      const notifications =
        await NotificationService.listByTarget(
          {
            target,
            limit,
          }
        );

      return ok(res, notifications, {
        meta: {
          count: notifications.length,
        },
      });
    } catch (error: any) {
      logger.error("NOTIFICATION_LIST_FAILED", {
        error: error?.message,
        requestId:
          req.gatewayContext?.requestId,
      });

      return httpError(res, {
        statusCode: 500,
        code: "NOTIFICATION_LIST_FAILED",
        message:
          error?.message ??
          "Unable to list notifications",
        requestId:
          req.gatewayContext?.requestId,
      });
    }
  }

  /* ======================================================================== */
  /* STATS                                                                    */
  /* ======================================================================== */

  /**
   * GET /notifications/stats
   * Statistiques globales (dashboard / IA / SLA).
   */
  static async getStats(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const stats =
        await NotificationService.getStats();

      return ok(res, stats);
    } catch (error: any) {
      logger.error("NOTIFICATION_STATS_FAILED", {
        error: error?.message,
        requestId:
          req.gatewayContext?.requestId,
      });

      return httpError(res, {
        statusCode: 500,
        code: "NOTIFICATION_STATS_FAILED",
        message:
          error?.message ??
          "Unable to compute stats",
        requestId:
          req.gatewayContext?.requestId,
      });
    }
  }

  /* ======================================================================== */
  /* RETRY (ADMIN / WORKER)                                                   */
  /* ======================================================================== */

  /**
   * POST /notifications/retry
   * Relancer les notifications en échec / pending.
   */
  static async retryPending(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const retried =
        await NotificationService.retryPending();

      logger.info("NOTIFICATION_RETRY_EXECUTED", {
        retried,
        requestId:
          req.gatewayContext?.requestId,
      });

      return ok(res, {
        retried,
      });
    } catch (error: any) {
      logger.error("NOTIFICATION_RETRY_FAILED", {
        error: error?.message,
        requestId:
          req.gatewayContext?.requestId,
      });

      return httpError(res, {
        statusCode: 500,
        code: "NOTIFICATION_RETRY_FAILED",
        message:
          error?.message ??
          "Retry execution failed",
        requestId:
          req.gatewayContext?.requestId,
      });
    }
  }
}
