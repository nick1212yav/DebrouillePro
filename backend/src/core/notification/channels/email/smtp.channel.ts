/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — SMTP EMAIL CHANNEL (SOVEREIGN CORE)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/channels/email/smtp.channel.ts        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE :                                                                    */
/*  - Envoi email direct SMTP (self-hosted ou ISP)                            */
/*  - Aucun vendor lock-in                                                   */
/*  - Compatible datacenter / LAN / satellite / offline relay                */
/*  - Support multi-MX + fallback                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import nodemailer, {
  Transporter,
  SentMessageInfo,
} from "nodemailer";
import crypto from "crypto";

import {
  NotificationChannel,
  ChannelSendParams,
  ChannelDeliveryResult,
  ChannelDeliveryStatus,
  ChannelFailureReason,
  ChannelHealth,
} from "../channel.interface";

import { channelRegistry } from "../channel.registry";

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

type SmtpEndpoint = {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  weight: number; // load balancing
};

const SMTP_ENDPOINTS: SmtpEndpoint[] = [
  {
    id: "primary-dc",
    host: "smtp.local",
    port: 587,
    secure: false,
    weight: 10,
  },
  {
    id: "backup-satellite",
    host: "smtp.backup",
    port: 587,
    secure: false,
    weight: 5,
  },
];

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

type EndpointState = {
  transporter: Transporter;
  healthy: boolean;
  lastCheckAt?: number;
  latencyMs?: number;
  errorRate: number;
};

const endpoints = new Map<
  string,
  EndpointState
>();

/* -------------------------------------------------------------------------- */
/* TRANSPORT INITIALIZATION                                                   */
/* -------------------------------------------------------------------------- */

const buildTransporter = (
  endpoint: SmtpEndpoint
): Transporter => {
  return nodemailer.createTransport({
    host: endpoint.host,
    port: endpoint.port,
    secure: endpoint.secure,
    auth: endpoint.user
      ? {
          user: endpoint.user,
          pass: endpoint.pass,
        }
      : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
};

for (const ep of SMTP_ENDPOINTS) {
  endpoints.set(ep.id, {
    transporter: buildTransporter(ep),
    healthy: true,
    errorRate: 0,
  });
}

/* -------------------------------------------------------------------------- */
/* HEALTH CHECK                                                               */
/* -------------------------------------------------------------------------- */

const checkEndpointHealth = async (
  id: string,
  state: EndpointState
) => {
  const start = Date.now();
  try {
    await state.transporter.verify();
    state.healthy = true;
    state.latencyMs = Date.now() - start;
    state.errorRate = Math.max(
      0,
      state.errorRate - 0.05
    );
  } catch {
    state.healthy = false;
    state.errorRate = Math.min(
      1,
      state.errorRate + 0.2
    );
  } finally {
    state.lastCheckAt = Date.now();
  }
};

setInterval(() => {
  endpoints.forEach((state, id) =>
    checkEndpointHealth(id, state)
  );
}, 30_000);

/* -------------------------------------------------------------------------- */
/* SMART ROUTING                                                              */
/* -------------------------------------------------------------------------- */

const selectBestEndpoint = (): EndpointState | null => {
  const candidates = Array.from(
    endpoints.values()
  ).filter((e) => e.healthy);

  if (!candidates.length) return null;

  return candidates.sort((a, b) => {
    const scoreA =
      (a.latencyMs ?? 1000) +
      a.errorRate * 1000;
    const scoreB =
      (b.latencyMs ?? 1000) +
      b.errorRate * 1000;
    return scoreA - scoreB;
  })[0];
};

/* -------------------------------------------------------------------------- */
/* CHANNEL IMPLEMENTATION                                                     */
/* -------------------------------------------------------------------------- */

export class SmtpEmailChannel
  implements NotificationChannel
{
  public readonly name = "email:smtp";

  /* ====================================================================== */
  /* HEALTH                                                                  */
  /* ====================================================================== */

  async healthCheck(): Promise<ChannelHealth> {
    return {
      channel: this.name,
      healthy: Array.from(endpoints.values()).some(
        (e) => e.healthy
      ),
      lastCheckedAt: new Date(),
      metadata: {
        endpoints: Array.from(
          endpoints.entries()
        ).map(([id, e]) => ({
          id,
          healthy: e.healthy,
          latencyMs: e.latencyMs,
          errorRate: e.errorRate,
          lastCheckAt: e.lastCheckAt,
        })),
      },
    };
  }

  /* ====================================================================== */
  /* SEND                                                                    */
  /* ====================================================================== */

  async send(
    params: ChannelSendParams
  ): Promise<ChannelDeliveryResult> {
    const endpoint = selectBestEndpoint();

    if (!endpoint) {
      return {
        status: ChannelDeliveryStatus.FAILED,
        failureReason:
          ChannelFailureReason.NO_AVAILABLE_PROVIDER,
      };
    }

    try {
      const messageId = crypto.randomUUID();

      const info: SentMessageInfo =
        await endpoint.transporter.sendMail({
          from: params.sender?.address,
          to: params.target.address,
          subject: params.payload.subject,
          text: params.payload.text,
          html: params.payload.html,
          headers: {
            "X-Debrouille-ID": messageId,
          },
        });

      return {
        status: ChannelDeliveryStatus.SENT,
        providerMessageId:
          info.messageId || messageId,
        rawResponse: info,
      };
    } catch (error) {
      endpoint.errorRate = Math.min(
        1,
        endpoint.errorRate + 0.2
      );

      return {
        status: ChannelDeliveryStatus.FAILED,
        failureReason:
          ChannelFailureReason.PROVIDER_ERROR,
        rawResponse: error,
      };
    }
  }
}

/* -------------------------------------------------------------------------- */
/* AUTO REGISTER                                                              */
/* -------------------------------------------------------------------------- */

channelRegistry.registerChannel({
  channel: new SmtpEmailChannel(),
  priority: 50,
  enabled: true,
});

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Zero vendor lock-in
 * ✔️ Auto-failover SMTP
 * ✔️ Pooling haute performance
 * ✔️ Compatible LAN / Satellite / Offline relay
 * ✔️ Prêt pour chiffrement, DKIM, SPF
 *
 * 👉 Souveraineté numérique totale.
 */
