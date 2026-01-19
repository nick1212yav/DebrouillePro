/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — DELIVERY SERVICE (WORLD #1 ENGINE)              */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/delivery/delivery.service.ts          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Orchestrer les tentatives de livraison                                  */
/*  - Appliquer retry, backoff, SLA                                            */
/*  - Garantir cohérence et immutabilité                                      */
/*                                                                            */
/*  PRINCIPES ABSOLUS :                                                       */
/*  - Append-only sur les tentatives                                          */
/*  - Machine d’état déterministe                                             */
/*  - Tolérance aux pannes                                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { Types } from "mongoose";

import { DeliveryModel, IDelivery } from "./delivery.model";
import {
  DeliveryStatus,
  DeliveryChannel,
  DeliveryAttempt,
  DeliveryReceipt,
} from "./delivery.types";

import { BackoffStrategy } from "../scheduler/backoff.strategy";
import { RetryPolicy } from "../scheduler/retry.policy";

import { ChannelRegistry } from "../channels/channel.registry";

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

type ExecuteDeliveryParams = {
  deliveryId: Types.ObjectId;
};

/* -------------------------------------------------------------------------- */
/* STATE MACHINE                                                              */
/* -------------------------------------------------------------------------- */

const FINAL_STATES: DeliveryStatus[] = [
  DeliveryStatus.DELIVERED,
  DeliveryStatus.READ,
  DeliveryStatus.FAILED,
  DeliveryStatus.EXPIRED,
  DeliveryStatus.CANCELLED,
];

/* -------------------------------------------------------------------------- */
/* DELIVERY SERVICE                                                           */
/* -------------------------------------------------------------------------- */

export class DeliveryService {
  /* ======================================================================== */
  /* CREATION                                                                */
  /* ======================================================================== */

  /**
   * Créer une livraison initiale.
   */
  static async createDelivery(params: {
    notificationId: Types.ObjectId;
    recipientId?: Types.ObjectId;
    channel: DeliveryChannel;
    destination: string;
    provider?: string;
  }): Promise<IDelivery> {
    const delivery = new DeliveryModel({
      notificationId: params.notificationId,
      recipientId: params.recipientId,
      channel: params.channel,
      destination: params.destination,
      provider: params.provider,
      status: DeliveryStatus.PENDING,
      attempts: [],
    });

    await delivery.save();
    return delivery;
  }

  /* ======================================================================== */
  /* EXECUTION                                                               */
  /* ======================================================================== */

  /**
   * Exécute une tentative de livraison.
   * Point d’entrée du scheduler / workers.
   */
  static async execute(
    params: ExecuteDeliveryParams
  ): Promise<void> {
    const delivery = await DeliveryModel.findById(
      params.deliveryId
    );

    if (!delivery) return;

    if (FINAL_STATES.includes(delivery.status)) {
      return;
    }

    const attemptNumber = delivery.attempts.length + 1;
    const now = new Date();

    const attempt: DeliveryAttempt = {
      attempt: attemptNumber,
      status: DeliveryStatus.SENDING,
      startedAt: now,
    };

    delivery.attempts.push(attempt);
    delivery.lastAttemptAt = now;
    delivery.status = DeliveryStatus.SENDING;

    await delivery.save();

    try {
      const channel = ChannelRegistry.resolve(
        delivery.channel
      );

      const result = await channel.send({
        destination: delivery.destination,
        notificationId: delivery.notificationId,
      });

      /* ---------------------------- SUCCESS ------------------------------ */

      const receipt: DeliveryReceipt = {
        deliveredAt: new Date(),
        confirmationSource: result.provider,
        confirmationPayload: result.raw,
      };

      attempt.status = DeliveryStatus.DELIVERED;
      attempt.endedAt = new Date();
      attempt.providerTrace = {
        provider: result.provider,
        providerMessageId: result.messageId,
        providerStatus: result.status,
        rawResponse: result.raw,
        receivedAt: new Date(),
      };

      delivery.receipt = receipt;
      delivery.status = DeliveryStatus.DELIVERED;

      await delivery.save();
      return;
    } catch (error: any) {
      /* ---------------------------- FAILURE ------------------------------ */

      attempt.status = DeliveryStatus.FAILED;
      attempt.endedAt = new Date();
      attempt.errorCode =
        error?.code || "DELIVERY_FAILED";
      attempt.errorMessage =
        error?.message || "Unknown error";

      await delivery.save();

      await this.handleRetry(delivery);
    }
  }

  /* ======================================================================== */
  /* RETRY LOGIC                                                              */
  /* ======================================================================== */

  private static async handleRetry(
    delivery: IDelivery
  ): Promise<void> {
    const policy = RetryPolicy.resolve(
      delivery.channel
    );

    const attempts = delivery.attempts.length;

    if (!policy.shouldRetry(attempts)) {
      delivery.status = DeliveryStatus.FAILED;
      await delivery.save();
      return;
    }

    const delayMs = BackoffStrategy.computeDelay(
      attempts,
      policy
    );

    delivery.status = DeliveryStatus.RETRY_SCHEDULED;
    await delivery.save();

    // Ici un scheduler réel replanifiera execute()
    setTimeout(() => {
      this.execute({ deliveryId: delivery._id });
    }, delayMs);
  }

  /* ======================================================================== */
  /* RECEIPTS                                                                */
  /* ======================================================================== */

  /**
   * Marquer une livraison comme lue.
   * (webhook provider, tracking pixel, mobile ack)
   */
  static async markAsRead(params: {
    deliveryId: Types.ObjectId;
    source?: string;
    payload?: unknown;
  }): Promise<void> {
    const delivery = await DeliveryModel.findById(
      params.deliveryId
    );

    if (!delivery) return;

    if (delivery.status !== DeliveryStatus.DELIVERED) {
      return;
    }

    delivery.status = DeliveryStatus.READ;

    delivery.receipt = {
      ...delivery.receipt,
      readAt: new Date(),
      confirmationSource:
        params.source ?? "CLIENT",
      confirmationPayload: params.payload,
    };

    await delivery.save();
  }

  /* ======================================================================== */
  /* CANCEL / EXPIRE                                                          */
  /* ======================================================================== */

  /**
   * Annuler une livraison.
   */
  static async cancel(
    deliveryId: Types.ObjectId,
    reason?: string
  ): Promise<void> {
    const delivery = await DeliveryModel.findById(
      deliveryId
    );

    if (!delivery) return;
    if (FINAL_STATES.includes(delivery.status))
      return;

    delivery.status = DeliveryStatus.CANCELLED;

    delivery.attempts.push({
      attempt: delivery.attempts.length + 1,
      status: DeliveryStatus.CANCELLED,
      startedAt: new Date(),
      endedAt: new Date(),
      errorMessage: reason,
    });

    await delivery.save();
  }

  /**
   * Expirer une livraison (TTL).
   */
  static async expire(
    deliveryId: Types.ObjectId
  ): Promise<void> {
    const delivery = await DeliveryModel.findById(
      deliveryId
    );

    if (!delivery) return;
    if (FINAL_STATES.includes(delivery.status))
      return;

    delivery.status = DeliveryStatus.EXPIRED;
    await delivery.save();
  }
}
