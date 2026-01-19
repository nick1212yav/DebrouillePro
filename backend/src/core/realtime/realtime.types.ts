/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — TYPES FONDAMENTAUX                                       */
/*  File: core/realtime/realtime.types.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  ⚡ Temps réel universel • Offline • Secure • Observable • IA Ready         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🔤 PRIMITIVES                                                               */
/* -------------------------------------------------------------------------- */

export type RealtimeNodeID = string;
export type RealtimeConnectionID = string;
export type RealtimeChannelID = string;
export type RealtimeClientID = string;
export type RealtimeSessionID = string;

export type EpochMillis = number;
export type Bytes = number;

/**
 * URI de transport :
 * ws://, wss://, mqtt://, rtc://, quic://, etc.
 */
export type RealtimeTransportURI = string;

/* -------------------------------------------------------------------------- */
/* 🎛️ ENUMS & LITERALS                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Protocole de transport
 */
export type RealtimeProtocol =
  | "websocket"
  | "webrtc"
  | "mqtt"
  | "quic"
  | "custom";

/**
 * État de connexion
 */
export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed";

/**
 * Mode de livraison
 */
export type RealtimeDeliveryMode =
  | "fire-and-forget"
  | "at-least-once"
  | "exactly-once";

/**
 * Priorité de message
 */
export type RealtimePriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

/**
 * Politique offline
 */
export type RealtimeOfflinePolicy =
  | "drop"
  | "queue"
  | "persist"
  | "sync";

/**
 * Niveau de confidentialité
 */
export type RealtimeConfidentiality =
  | "public"
  | "internal"
  | "restricted"
  | "secret";

/* -------------------------------------------------------------------------- */
/* 📡 QUALITÉ DE SERVICE                                                       */
/* -------------------------------------------------------------------------- */

export interface RealtimeQoS {
  delivery: RealtimeDeliveryMode;
  priority: RealtimePriority;
  ttlMs?: number;
  maxRetry?: number;
  orderingKey?: string;
}

/* -------------------------------------------------------------------------- */
/* 🔐 SÉCURITÉ                                                                 */
/* -------------------------------------------------------------------------- */

export interface RealtimeSecurityPolicy {
  confidentiality: RealtimeConfidentiality;
  encrypted: boolean;
  signed?: boolean;
  allowedClients?: RealtimeClientID[];
}

/* -------------------------------------------------------------------------- */
/* 🌐 OFFLINE & RESILIENCE                                                     */
/* -------------------------------------------------------------------------- */

export interface RealtimeOfflineConfig {
  policy: RealtimeOfflinePolicy;
  maxQueueSize?: number;
  persistKey?: string;
  replayOnReconnect?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 🧭 TRACE & OBSERVABILITÉ                                                    */
/* -------------------------------------------------------------------------- */

export interface RealtimeTraceContext {
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  sourceNode?: RealtimeNodeID;
  region?: string;
}

/* -------------------------------------------------------------------------- */
/* 📨 MESSAGE                                                                  */
/* -------------------------------------------------------------------------- */

export interface RealtimeMessage<TPayload = unknown> {
  id: string;
  channel: RealtimeChannelID;
  payload: TPayload;
  timestamp: EpochMillis;

  qos?: RealtimeQoS;
  security?: RealtimeSecurityPolicy;
  offline?: RealtimeOfflineConfig;
  trace?: RealtimeTraceContext;

  headers?: Record<string, string>;
}

/* -------------------------------------------------------------------------- */
/* 📦 ENVELOPE (TRANSPORT LEVEL)                                               */
/* -------------------------------------------------------------------------- */

export interface RealtimeEnvelope {
  protocol: RealtimeProtocol;
  transportUri?: RealtimeTransportURI;
  connectionId?: RealtimeConnectionID;
  raw: Uint8Array;
  receivedAt: EpochMillis;
}

/* -------------------------------------------------------------------------- */
/* 🧪 UTILITAIRES DE TYPE                                                      */
/* -------------------------------------------------------------------------- */

export type RealtimePublishInput<T> = Omit<
  RealtimeMessage<T>,
  "id" | "timestamp"
>;

export type RealtimeReadonlyMessage<T> =
  Readonly<RealtimeMessage<T>>;

/**
 * Ack de livraison
 */
export interface RealtimeAck {
  messageId: string;
  receivedAt: EpochMillis;
  processed?: boolean;
}
