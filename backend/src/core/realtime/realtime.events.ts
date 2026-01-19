/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — DOMAIN EVENTS                                            */
/*  File: core/realtime/realtime.events.ts                                    */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  ⚡ Observability • Replay • Distributed Debug                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  RealtimeConnectionID,
  RealtimeChannelID,
  RealtimeClientID,
  RealtimeProtocol,
  RealtimeConnectionState,
  EpochMillis,
} from "./realtime.types";

/* -------------------------------------------------------------------------- */
/* 🆔 PRIMITIVES EVENT                                                         */
/* -------------------------------------------------------------------------- */

export type RealtimeEventID = string;

export type RealtimeEventName =
  | "realtime.node.started"
  | "realtime.node.stopped"
  | "realtime.connection.opened"
  | "realtime.connection.closed"
  | "realtime.connection.failed"
  | "realtime.connection.reconnecting"
  | "realtime.channel.joined"
  | "realtime.channel.left"
  | "realtime.message.published"
  | "realtime.message.received"
  | "realtime.message.acknowledged"
  | "realtime.backpressure"
  | "realtime.offline.queue.flushed"
  | "realtime.error";

/**
 * Sévérité
 */
export type RealtimeEventSeverity =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

/* -------------------------------------------------------------------------- */
/* 🧭 TRACE                                                                    */
/* -------------------------------------------------------------------------- */

export interface RealtimeEventTrace {
  traceId?: string;
  correlationId?: string;
  nodeId?: string;
  region?: string;
}

/* -------------------------------------------------------------------------- */
/* 🔐 SECURITY                                                                 */
/* -------------------------------------------------------------------------- */

export interface RealtimeEventSecurity {
  signed?: boolean;
  confidentiality?: "public" | "internal" | "restricted" | "secret";
}

/* -------------------------------------------------------------------------- */
/* ♻️ REPLAY                                                                   */
/* -------------------------------------------------------------------------- */

export interface RealtimeEventReplay {
  replayable: boolean;
  sequence?: number;
}

/* -------------------------------------------------------------------------- */
/* 🧩 EVENT BASE                                                               */
/* -------------------------------------------------------------------------- */

export interface RealtimeEventBase<TPayload> {
  id: RealtimeEventID;
  name: RealtimeEventName;
  version: number;
  timestamp: EpochMillis;

  payload: TPayload;
  severity: RealtimeEventSeverity;

  trace?: RealtimeEventTrace;
  security?: RealtimeEventSecurity;
  replay?: RealtimeEventReplay;
}

/* -------------------------------------------------------------------------- */
/* 📦 PAYLOADS                                                                 */
/* -------------------------------------------------------------------------- */

export interface NodeStartedPayload {
  nodeId: string;
  protocol: RealtimeProtocol;
}

export interface NodeStoppedPayload {
  nodeId: string;
  reason?: string;
}

export interface ConnectionOpenedPayload {
  connectionId: RealtimeConnectionID;
  clientId?: RealtimeClientID;
  protocol: RealtimeProtocol;
}

export interface ConnectionClosedPayload {
  connectionId: RealtimeConnectionID;
  state: RealtimeConnectionState;
  reason?: string;
}

export interface ConnectionFailedPayload {
  connectionId?: RealtimeConnectionID;
  error: string;
}

export interface ConnectionReconnectingPayload {
  connectionId: RealtimeConnectionID;
  attempt: number;
}

export interface ChannelJoinedPayload {
  channel: RealtimeChannelID;
  connectionId: RealtimeConnectionID;
}

export interface ChannelLeftPayload {
  channel: RealtimeChannelID;
  connectionId: RealtimeConnectionID;
}

export interface MessagePublishedPayload {
  channel: RealtimeChannelID;
  messageId: string;
  sizeBytes?: number;
}

export interface MessageReceivedPayload {
  channel: RealtimeChannelID;
  messageId: string;
  latencyMs?: number;
}

export interface MessageAcknowledgedPayload {
  messageId: string;
  processed: boolean;
}

export interface BackpressurePayload {
  queueSize: number;
  maxQueueSize: number;
}

export interface OfflineQueueFlushedPayload {
  flushedCount: number;
}

export interface RealtimeErrorPayload {
  message: string;
  stack?: string;
}

/* -------------------------------------------------------------------------- */
/* 🧪 EVENTS SPÉCIALISÉS                                                       */
/* -------------------------------------------------------------------------- */

export type NodeStartedEvent =
  RealtimeEventBase<NodeStartedPayload> & {
    name: "realtime.node.started";
  };

export type NodeStoppedEvent =
  RealtimeEventBase<NodeStoppedPayload> & {
    name: "realtime.node.stopped";
  };

export type ConnectionOpenedEvent =
  RealtimeEventBase<ConnectionOpenedPayload> & {
    name: "realtime.connection.opened";
  };

export type ConnectionClosedEvent =
  RealtimeEventBase<ConnectionClosedPayload> & {
    name: "realtime.connection.closed";
  };

export type ConnectionFailedEvent =
  RealtimeEventBase<ConnectionFailedPayload> & {
    name: "realtime.connection.failed";
  };

export type ConnectionReconnectingEvent =
  RealtimeEventBase<ConnectionReconnectingPayload> & {
    name: "realtime.connection.reconnecting";
  };

export type ChannelJoinedEvent =
  RealtimeEventBase<ChannelJoinedPayload> & {
    name: "realtime.channel.joined";
  };

export type ChannelLeftEvent =
  RealtimeEventBase<ChannelLeftPayload> & {
    name: "realtime.channel.left";
  };

export type MessagePublishedEvent =
  RealtimeEventBase<MessagePublishedPayload> & {
    name: "realtime.message.published";
  };

export type MessageReceivedEvent =
  RealtimeEventBase<MessageReceivedPayload> & {
    name: "realtime.message.received";
  };

export type MessageAcknowledgedEvent =
  RealtimeEventBase<MessageAcknowledgedPayload> & {
    name: "realtime.message.acknowledged";
  };

export type BackpressureEvent =
  RealtimeEventBase<BackpressurePayload> & {
    name: "realtime.backpressure";
  };

export type OfflineQueueFlushedEvent =
  RealtimeEventBase<OfflineQueueFlushedPayload> & {
    name: "realtime.offline.queue.flushed";
  };

export type RealtimeErrorEvent =
  RealtimeEventBase<RealtimeErrorPayload> & {
    name: "realtime.error";
  };

/**
 * Union totale des événements realtime
 */
export type RealtimeEvent =
  | NodeStartedEvent
  | NodeStoppedEvent
  | ConnectionOpenedEvent
  | ConnectionClosedEvent
  | ConnectionFailedEvent
  | ConnectionReconnectingEvent
  | ChannelJoinedEvent
  | ChannelLeftEvent
  | MessagePublishedEvent
  | MessageReceivedEvent
  | MessageAcknowledgedEvent
  | BackpressureEvent
  | OfflineQueueFlushedEvent
  | RealtimeErrorEvent;

/* -------------------------------------------------------------------------- */
/* 🏭 FACTORY                                                                  */
/* -------------------------------------------------------------------------- */

function generateEventId(): RealtimeEventID {
  return `rt_evt_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function now(): EpochMillis {
  return Date.now();
}

export class RealtimeEventFactory {
  static nodeStarted(payload: NodeStartedPayload): NodeStartedEvent {
    return {
      id: generateEventId(),
      name: "realtime.node.started",
      version: 1,
      timestamp: now(),
      payload,
      severity: "info",
      replay: { replayable: false },
    };
  }

  static connectionOpened(
    payload: ConnectionOpenedPayload
  ): ConnectionOpenedEvent {
    return {
      id: generateEventId(),
      name: "realtime.connection.opened",
      version: 1,
      timestamp: now(),
      payload,
      severity: "info",
      replay: { replayable: false },
    };
  }

  static messagePublished(
    payload: MessagePublishedPayload
  ): MessagePublishedEvent {
    return {
      id: generateEventId(),
      name: "realtime.message.published",
      version: 1,
      timestamp: now(),
      payload,
      severity: "debug",
      replay: { replayable: true },
    };
  }

  static error(payload: RealtimeErrorPayload): RealtimeErrorEvent {
    return {
      id: generateEventId(),
      name: "realtime.error",
      version: 1,
      timestamp: now(),
      payload,
      severity: "error",
      replay: { replayable: true },
    };
  }
}
