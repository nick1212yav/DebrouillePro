/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — NOTIFICATION SERVICE (WORLD #1)                 */
/*  File: backend/src/core/notification/notification.service.ts              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION :                                                                 */
/*  - Orchestrer l’envoi intelligent multi-canal                              */
/*  - Garantir idempotence, retry adaptatif, traçabilité                      */
/*  - Optimiser coût / latence / fiabilité                                    */
/*  - Préparer IA, offline, edge                                              */
/*                                                                            */
/*  GARANTIES :                                                               */
/*  - Jamais de duplication                                                   */
/*  - Jamais de perte silencieuse                                              */
/*  - Tout est observable et auditable                                        */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

import {
  NotificationModel,
  INotification,
} from "./notification.model";

import {
  NotificationChannel,
  NotificationPriority,
  NotificationMode,
  NotificationIntent,
  NotificationDeliveryStatus,
  NotificationRequest,
  NotificationDeliveryReceipt,
} from "./notification.types";

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Résultat d’un envoi réel par un provider.
 * (abstraction réseau)
 */
type ProviderSendResult = {
  success: boolean;
  providerMessageId?: string;
  latencyMs?: number;
  costUsd?: number;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Abstraction d’un provider de notification.
 */
export interface NotificationProvider {
  channel: NotificationChannel;
  send(
    request: NotificationRequest
  ): Promise<ProviderSendResult>;
}

/* -------------------------------------------------------------------------- */
/* PROVIDER REGISTRY (PLUGGABLE)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Registre dynamique des providers.
 * Peut être enrichi à chaud (plugins, micro-services, edge).
 */
const PROVIDERS = new Map<
  NotificationChannel,
  NotificationProvider
>();

export const registerNotificationProvider = (
  provider: NotificationProvider
) => {
  PROVIDERS.set(provider.channel, provider);
};

/* -------------------------------------------------------------------------- */
/* POLICY ENGINE (ROUTING INTELLIGENT)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Résoudre dynamiquement les canaux à utiliser.
 * (priorité, urgence, offline, préférences futures)
 */
const resolveChannels = (
  request: NotificationRequest
): NotificationChannel[] => {
  // Stratégie simple extensible
  switch (request.priority) {
    case NotificationPriority.CRITICAL:
      return [
        NotificationChannel.PUSH,
        NotificationChannel.SMS,
        NotificationChannel.EMAIL,
      ];

    case NotificationPriority.HIGH:
      return [
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL,
      ];

    default:
      return [NotificationChannel.PUSH];
  }
};

/**
 * Politique de retry adaptatif.
 */
const shouldRetry = (
  receipt: NotificationDeliveryReceipt
): boolean => {
  if (receipt.status === NotificationDeliveryStatus.DELIVERED)
    return false;

  return receipt.attempts < 3;
};

/* -------------------------------------------------------------------------- */
/* NOTIFICATION SERVICE                                                       */
/* -------------------------------------------------------------------------- */

export class NotificationService {
  /* ======================================================================== */
  /* CREATE & IDEMPOTENCE                                                     */
  /* ======================================================================== */

  /**
   * Crée ou récupère une notification existante (idempotence).
   */
  static async createOrGet(
    request: NotificationRequest
  ): Promise<INotification> {
    if (request.idempotencyKey) {
      const existing =
        await NotificationModel.findOne({
          "request.idempotencyKey":
            request.idempotencyKey,
        });

      if (existing) return existing;
    }

    const resolvedChannels =
      resolveChannels(request);

    const notification = new NotificationModel({
      request,
      resolvedChannels,
      globalStatus:
        NotificationDeliveryStatus.PENDING,
      deliveries: [],
      expiresAt: request.schedule?.expiresAt,
    });

    await notification.save();
    return notification;
  }

  /* ======================================================================== */
  /* DISPATCH ENGINE                                                          */
  /* ======================================================================== */

  /**
   * Point d’entrée principal.
   * Envoie la notification sur tous les canaux résolus.
   */
  static async dispatch(
    request: NotificationRequest
  ): Promise<INotification> {
    const notification =
      await this.createOrGet(request);

    for (const channel of
      notification.resolvedChannels) {
      await this.dispatchToChannel(
        notification,
        channel
      );
    }

    await this.recomputeGlobalStatus(notification);

    return notification;
  }

  /* ======================================================================== */
  /* CHANNEL DISPATCH                                                         */
  /* ======================================================================== */

  private static async dispatchToChannel(
    notification: INotification,
    channel: NotificationChannel
  ) {
    const provider = PROVIDERS.get(channel);

    if (!provider) {
      this.markDeliveryError(
        notification,
        channel,
        "NO_PROVIDER",
        "No provider registered for channel"
      );
      return;
    }

    let receipt =
      notification.deliveries.find(
        (d) => d.channel === channel
      );

    if (!receipt) {
      receipt = {
        channel,
        provider: provider.channel,
        status: NotificationDeliveryStatus.PENDING,
        attempts: 0,
      };
      notification.deliveries.push(receipt);
    }

    if (!shouldRetry(receipt)) return;

    receipt.attempts += 1;
    receipt.lastAttemptAt = new Date();

    try {
      const result = await provider.send(
        notification.request
      );

      if (result.success) {
        receipt.status =
          NotificationDeliveryStatus.DELIVERED;
        receipt.deliveredAt = new Date();
      } else {
        receipt.status =
          NotificationDeliveryStatus.FAILED;
        receipt.errorCode = result.errorCode;
        receipt.errorMessage =
          result.errorMessage;
      }

      receipt.latencyMs = result.latencyMs;
      receipt.costUsd = result.costUsd;
    } catch (error: any) {
      receipt.status =
        NotificationDeliveryStatus.FAILED;
      receipt.errorMessage =
        error?.message ?? "Unknown provider error";
    }

    await notification.save();
  }

  /* ======================================================================== */
  /* GLOBAL STATUS AGGREGATION                                                 */
  /* ======================================================================== */

  /**
   * Recalcule l’état global de la notification.
   */
  private static async recomputeGlobalStatus(
    notification: INotification
  ) {
    const statuses = notification.deliveries.map(
      (d) => d.status
    );

    if (
      statuses.some(
        (s) =>
          s ===
          NotificationDeliveryStatus.DELIVERED
      )
    ) {
      notification.globalStatus =
        NotificationDeliveryStatus.DELIVERED;
    } else if (
      statuses.every(
        (s) =>
          s ===
          NotificationDeliveryStatus.FAILED
      )
    ) {
      notification.globalStatus =
        NotificationDeliveryStatus.FAILED;
    } else {
      notification.globalStatus =
        NotificationDeliveryStatus.PENDING;
    }

    await notification.save();
  }

  /* ======================================================================== */
  /* ERROR MANAGEMENT                                                         */
  /* ======================================================================== */

  private static markDeliveryError(
    notification: INotification,
    channel: NotificationChannel,
    code: string,
    message: string
  ) {
    notification.deliveries.push({
      channel,
      provider: "SYSTEM",
      status: NotificationDeliveryStatus.FAILED,
      attempts: 1,
      errorCode: code,
      errorMessage: message,
    });
  }

  /* ======================================================================== */
  /* RETRY WORKER (CRON / QUEUE)                                               */
  /* ======================================================================== */

  /**
   * Relance automatiquement les notifications incomplètes.
   * Peut être exécuté via cron / queue / worker distribué.
   */
  static async retryPending(): Promise<number> {
    const pending =
      await NotificationModel.find({
        globalStatus:
          NotificationDeliveryStatus.PENDING,
      }).limit(100);

    let retried = 0;

    for (const notification of pending) {
      for (const channel of
        notification.resolvedChannels) {
        await this.dispatchToChannel(
          notification,
          channel
        );
      }

      await this.recomputeGlobalStatus(notification);
      retried++;
    }

    return retried;
  }

  /* ======================================================================== */
  /* READ MODELS                                                              */
  /* ======================================================================== */

  /**
   * Récupérer une notification par id.
   */
  static async getById(
    id: Types.ObjectId
  ): Promise<INotification | null> {
    return NotificationModel.findById(id);
  }

  /**
   * Historique par cible (utilisateur / device / org).
   */
  static async listByTarget(params: {
    target: any;
    limit?: number;
  }): Promise<INotification[]> {
    return NotificationModel.find({
      "request.target": params.target,
    })
      .sort({ createdAt: -1 })
      .limit(params.limit ?? 50)
      .exec();
  }

  /* ======================================================================== */
  /* OBSERVABILITY                                                            */
  /* ======================================================================== */

  /**
   * Statistiques globales.
   * Base pour dashboard, IA, SLA.
   */
  static async getStats() {
    const total = await NotificationModel.count();
    const delivered =
      await NotificationModel.count({
        globalStatus:
          NotificationDeliveryStatus.DELIVERED,
      });
    const failed =
      await NotificationModel.count({
        globalStatus:
          NotificationDeliveryStatus.FAILED,
      });

    return {
      total,
      delivered,
      failed,
      successRate:
        total > 0
          ? Number(
              ((delivered / total) * 100).toFixed(
                2
              )
            )
          : 0,
    };
  }
}
