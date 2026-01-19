/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — REALTIME SERVICE (ORCHESTRATOR)                          */
/*  File: core/realtime/realtime.service.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  ⚡ Multi-protocol • Offline • Secure • Observable • Scalable               */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  RealtimeChannelID,
  RealtimeMessage,
  RealtimePublishInput,
  RealtimeConnectionID,
  RealtimeClientID,
} from "./realtime.types";

import {
  RealtimeGateway,
  RealtimeGatewayObserver,
} from "./realtime.gateway.interface";

import {
  RealtimeChannel,
} from "./realtime.channel.model";

import {
  RealtimeEvent,
  RealtimeEventFactory,
} from "./realtime.events";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class RealtimeServiceError extends Error {
  constructor(message: string) {
    super(`[RealtimeService] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface RealtimeServiceObserver {
  onEvent?(event: RealtimeEvent): void;
  onError?(error: Error): void;
  onMetric?(name: string, value: number): void;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURATION                                                            */
/* -------------------------------------------------------------------------- */

export interface RealtimeServiceConfig {
  offlineQueueLimit?: number;
  autoReconnect?: boolean;
}

/* -------------------------------------------------------------------------- */
/* ⚡ REALTIME SERVICE                                                         */
/* -------------------------------------------------------------------------- */

export class RealtimeService {
  private readonly gateways = new Map<
    RealtimeConnectionID,
    RealtimeGateway
  >();

  private readonly channels = new Map<
    RealtimeChannelID,
    RealtimeChannel
  >();

  constructor(
    private readonly observer?: RealtimeServiceObserver,
    private readonly config: RealtimeServiceConfig = {}
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔌 CONNECTION MANAGEMENT                                                  */
  /* ------------------------------------------------------------------------ */

  async connect(
    gateway: RealtimeGateway,
    clientId?: RealtimeClientID
  ): Promise<RealtimeConnectionID> {
    try {
      const connectionId = await gateway.connect(
        clientId,
        this.createGatewayObserver(gateway)
      );

      this.gateways.set(connectionId, gateway);

      this.emit(
        RealtimeEventFactory.nodeStarted({
          nodeId: connectionId,
          protocol: gateway.protocol,
        })
      );

      return connectionId;
    } catch (err: any) {
      this.observer?.onError?.(err);
      throw new RealtimeServiceError(err.message);
    }
  }

  async disconnect(connectionId: RealtimeConnectionID) {
    const gateway = this.gateways.get(connectionId);
    if (!gateway) return;

    await gateway.disconnect(connectionId);
    this.gateways.delete(connectionId);
  }

  /* ------------------------------------------------------------------------ */
  /* 📡 CHANNEL MANAGEMENT                                                     */
  /* ------------------------------------------------------------------------ */

  getOrCreateChannel(
    channelId: RealtimeChannelID
  ): RealtimeChannel {
    let channel = this.channels.get(channelId);
    if (!channel) {
      channel = new RealtimeChannel(channelId);
      this.channels.set(channelId, channel);
    }
    return channel;
  }

  subscribe(
    connectionId: RealtimeConnectionID,
    channelId: RealtimeChannelID,
    clientId: RealtimeClientID
  ) {
    const channel = this.getOrCreateChannel(channelId);
    channel.subscribe(clientId);

    const gateway = this.gateways.get(connectionId);
    gateway?.subscribe(connectionId, channelId);
  }

  unsubscribe(
    connectionId: RealtimeConnectionID,
    channelId: RealtimeChannelID,
    clientId: RealtimeClientID
  ) {
    const channel = this.channels.get(channelId);
    channel?.unsubscribe(clientId);

    const gateway = this.gateways.get(connectionId);
    gateway?.unsubscribe(connectionId, channelId);
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 PUBLISH                                                                */
  /* ------------------------------------------------------------------------ */

  async publish<T>(
    connectionId: RealtimeConnectionID,
    input: RealtimePublishInput<T>
  ) {
    try {
      const gateway = this.gateways.get(connectionId);
      if (!gateway) {
        throw new RealtimeServiceError(
          "Gateway not found for connection"
        );
      }

      const message: RealtimeMessage<T> = {
        ...input,
        id: `msg_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        timestamp: Date.now(),
      };

      const channel = this.getOrCreateChannel(message.channel);
      channel.publish(message);

      await gateway.publish(connectionId, message);

      this.emit(
        RealtimeEventFactory.messagePublished({
          channel: message.channel,
          messageId: message.id,
          sizeBytes: JSON.stringify(message).length,
        })
      );
    } catch (err: any) {
      this.observer?.onError?.(err);
      throw new RealtimeServiceError(err.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 🔭 INTERNAL OBSERVER                                                      */
  /* ------------------------------------------------------------------------ */

  private createGatewayObserver(
    gateway: RealtimeGateway
  ): RealtimeGatewayObserver {
    return {
      onMessage: (message) => {
        const channel = this.getOrCreateChannel(
          message.channel
        );
        channel.publish(message);

        this.emit(
          RealtimeEventFactory.messageReceived({
            channel: message.channel,
            messageId: message.id,
          })
        );
      },

      onError: (error) => {
        this.emit(
          RealtimeEventFactory.error({
            message: error.message,
            stack: error.stack,
          })
        );
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* 📣 EVENT EMISSION                                                         */
  /* ------------------------------------------------------------------------ */

  private emit(event: RealtimeEvent) {
    this.observer?.onEvent?.(event);
  }
}
