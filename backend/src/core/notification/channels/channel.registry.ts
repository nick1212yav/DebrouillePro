/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE NOTIFICATION — CHANNEL REGISTRY (WORLD #1 CORE)               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/notification/channels/channel.registry.ts          */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE STRATÉGIQUE :                                                        */
/*  - Registre vivant de tous les canaux disponibles                          */
/*  - Résolution dynamique & fallback automatique                             */
/*  - Point d’entrée unique pour l’orchestration                              */
/*                                                                            */
/*  CE MODULE EST LE CERVEAU DU ROUTAGE                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  NotificationChannel,
  ChannelDeliveryContext,
  ChannelDeliveryResult,
  ChannelTarget,
  ChannelPayload,
  ChannelHealth,
  ChannelDeliveryStatus,
} from "./channel.interface";

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

type ChannelEntry = {
  channel: NotificationChannel;
  registeredAt: Date;
  priority: number;
  enabled: boolean;
};

/* -------------------------------------------------------------------------- */
/* CHANNEL REGISTRY                                                           */
/* -------------------------------------------------------------------------- */

class ChannelRegistry {
  private readonly channels = new Map<string, ChannelEntry>();

  /* ====================================================================== */
  /* REGISTRATION                                                           */
  /* ====================================================================== */

  /**
   * Enregistrer un canal dynamiquement.
   * (Boot time ou hot-plug)
   */
  registerChannel(params: {
    channel: NotificationChannel;
    priority?: number;
    enabled?: boolean;
  }): void {
    const name = params.channel.name;

    if (this.channels.has(name)) {
      throw new Error(
        `Channel already registered: ${name}`
      );
    }

    this.channels.set(name, {
      channel: params.channel,
      registeredAt: new Date(),
      priority: params.priority ?? 100,
      enabled: params.enabled ?? true,
    });
  }

  /**
   * Désactiver un canal sans le supprimer.
   */
  disableChannel(name: string): void {
    const entry = this.channels.get(name);
    if (entry) {
      entry.enabled = false;
    }
  }

  /**
   * Réactiver un canal.
   */
  enableChannel(name: string): void {
    const entry = this.channels.get(name);
    if (entry) {
      entry.enabled = true;
    }
  }

  /* ====================================================================== */
  /* DISCOVERY                                                              */
  /* ====================================================================== */

  /**
   * Lister tous les canaux actifs.
   */
  listActiveChannels(): NotificationChannel[] {
    return [...this.channels.values()]
      .filter((c) => c.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map((c) => c.channel);
  }

  /**
   * Obtenir un canal par nom.
   */
  getChannel(name: string): NotificationChannel | null {
    const entry = this.channels.get(name);
    if (!entry || !entry.enabled) return null;
    return entry.channel;
  }

  /* ====================================================================== */
  /* HEALTH                                                                  */
  /* ====================================================================== */

  /**
   * Vérifier la santé de tous les canaux.
   */
  async healthCheckAll(): Promise<ChannelHealth[]> {
    const results: ChannelHealth[] = [];

    for (const entry of this.channels.values()) {
      try {
        const health =
          await entry.channel.healthCheck();
        results.push(health);
      } catch (error) {
        results.push({
          channel: entry.channel.name,
          healthy: false,
          lastCheckedAt: new Date(),
          metadata: {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
        });
      }
    }

    return results;
  }

  /* ====================================================================== */
  /* DELIVERY ORCHESTRATION                                                  */
  /* ====================================================================== */

  /**
   * Envoyer via le meilleur canal disponible avec fallback automatique.
   */
  async deliver(params: {
    target: ChannelTarget;
    payload: ChannelPayload;
    context: ChannelDeliveryContext;
    preferredChannels?: string[];
  }): Promise<ChannelDeliveryResult> {
    const orderedChannels =
      this.resolveDeliveryOrder(
        params.preferredChannels
      );

    let lastError: ChannelDeliveryResult | null =
      null;

    for (const channel of orderedChannels) {
      try {
        const result = await channel.send({
          target: params.target,
          payload: params.payload,
          context: params.context,
        });

        if (
          result.status ===
            ChannelDeliveryStatus.SENT ||
          result.status ===
            ChannelDeliveryStatus.DELIVERED
        ) {
          return result;
        }

        lastError = result;
      } catch (error) {
        lastError = {
          status: ChannelDeliveryStatus.FAILED,
          failureReason: "UNKNOWN" as any,
          rawResponse: error,
        };
      }
    }

    return (
      lastError ?? {
        status: ChannelDeliveryStatus.FAILED,
        failureReason: "UNKNOWN" as any,
      }
    );
  }

  /* ====================================================================== */
  /* ROUTING LOGIC                                                           */
  /* ====================================================================== */

  /**
   * Résoudre l’ordre de tentative des canaux.
   */
  private resolveDeliveryOrder(
    preferred?: string[]
  ): NotificationChannel[] {
    const active =
      this.listActiveChannels();

    if (!preferred || preferred.length === 0) {
      return active;
    }

    const preferredSet = new Set(preferred);

    const preferredChannels = active.filter(
      (c) => preferredSet.has(c.name)
    );

    const fallbackChannels = active.filter(
      (c) => !preferredSet.has(c.name)
    );

    return [...preferredChannels, ...fallbackChannels];
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON EXPORT                                                           */
/* -------------------------------------------------------------------------- */

export const channelRegistry = new ChannelRegistry();

/* -------------------------------------------------------------------------- */
/* CTO NOTE                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * ✔️ Hot-plug channels
 * ✔️ Fallback automatique
 * ✔️ Priorisation dynamique
 * ✔️ Health monitoring intégré
 * ✔️ Scalabilité cloud native
 *
 * 👉 Ce registre peut gérer des centaines de providers sans changement.
 */
