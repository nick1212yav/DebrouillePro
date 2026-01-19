/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — CHANNEL MODEL                                            */
/*  File: core/realtime/realtime.channel.model.ts                             */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📡 Channel = Micro-kernel temps réel                                       */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  RealtimeChannelID,
  RealtimeClientID,
  RealtimeMessage,
  RealtimeQoS,
  RealtimeOfflineConfig,
  RealtimeSecurityPolicy,
  EpochMillis,
} from "./realtime.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class RealtimeChannelError extends Error {
  constructor(message: string) {
    super(`[RealtimeChannel] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 📊 METRICS                                                                  */
/* -------------------------------------------------------------------------- */

export interface RealtimeChannelMetrics {
  subscribers: number;
  publishedMessages: number;
  deliveredMessages: number;
  droppedMessages: number;
  bufferedMessages: number;
  lastPublishedAt?: EpochMillis;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURATION                                                            */
/* -------------------------------------------------------------------------- */

export interface RealtimeChannelConfig {
  qos?: RealtimeQoS;
  offline?: RealtimeOfflineConfig;
  security?: RealtimeSecurityPolicy;
  maxBufferSize?: number;
}

/* -------------------------------------------------------------------------- */
/* 🧬 INTERNAL STATE                                                           */
/* -------------------------------------------------------------------------- */

interface ChannelState {
  subscribers: Set<RealtimeClientID>;
  buffer: RealtimeMessage[];
  metrics: RealtimeChannelMetrics;
}

/* -------------------------------------------------------------------------- */
/* 🧬 CHANNEL ENTITY                                                           */
/* -------------------------------------------------------------------------- */

export class RealtimeChannel {
  private readonly state: ChannelState;

  constructor(
    readonly id: RealtimeChannelID,
    private readonly config: RealtimeChannelConfig = {}
  ) {
    this.state = {
      subscribers: new Set(),
      buffer: [],
      metrics: {
        subscribers: 0,
        publishedMessages: 0,
        deliveredMessages: 0,
        droppedMessages: 0,
        bufferedMessages: 0,
      },
    };
  }

  /* ------------------------------------------------------------------------ */
  /* 👥 SUBSCRIPTIONS                                                          */
  /* ------------------------------------------------------------------------ */

  subscribe(clientId: RealtimeClientID) {
    this.state.subscribers.add(clientId);
    this.state.metrics.subscribers =
      this.state.subscribers.size;
  }

  unsubscribe(clientId: RealtimeClientID) {
    this.state.subscribers.delete(clientId);
    this.state.metrics.subscribers =
      this.state.subscribers.size;
  }

  getSubscribers(): RealtimeClientID[] {
    return Array.from(this.state.subscribers);
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 PUBLISH                                                                */
  /* ------------------------------------------------------------------------ */

  publish(message: RealtimeMessage): void {
    this.state.metrics.publishedMessages++;
    this.state.metrics.lastPublishedAt = Date.now();

    const offlinePolicy =
      message.offline ?? this.config.offline;

    if (offlinePolicy?.policy === "queue") {
      this.enqueue(message);
    }

    if (
      offlinePolicy?.policy === "drop" &&
      this.state.subscribers.size === 0
    ) {
      this.state.metrics.droppedMessages++;
      return;
    }

    this.state.metrics.deliveredMessages +=
      this.state.subscribers.size;
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ OFFLINE BUFFER                                                         */
  /* ------------------------------------------------------------------------ */

  private enqueue(message: RealtimeMessage) {
    const max = this.config.maxBufferSize ?? 1_000;

    if (this.state.buffer.length >= max) {
      this.state.buffer.shift(); // drop oldest
      this.state.metrics.droppedMessages++;
    }

    this.state.buffer.push(message);
    this.state.metrics.bufferedMessages =
      this.state.buffer.length;
  }

  flushBuffer(): RealtimeMessage[] {
    const flushed = [...this.state.buffer];
    this.state.buffer = [];
    this.state.metrics.bufferedMessages = 0;
    return flushed;
  }

  /* ------------------------------------------------------------------------ */
  /* 🔐 SECURITY                                                               */
  /* ------------------------------------------------------------------------ */

  canClientAccess(clientId: RealtimeClientID): boolean {
    const policy = this.config.security;
    if (!policy?.allowedClients) return true;
    return policy.allowedClients.includes(clientId);
  }

  /* ------------------------------------------------------------------------ */
  /* 📊 METRICS                                                                */
  /* ------------------------------------------------------------------------ */

  getMetrics(): RealtimeChannelMetrics {
    return { ...this.state.metrics };
  }
}
