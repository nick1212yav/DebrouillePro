/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — PUBLIC API                                               */
/*  File: core/realtime/index.ts                                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🎯 Objectifs :                                                            */
/*   - Point d’entrée officiel du module Realtime                             */
/*   - Exports strictement gouvernés                                           */
/*   - Aucun side-effect                                                      */
/*   - Tree-shaking friendly                                                   */
/*   - Stabilité contractuelle long terme                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🧬 TYPES FONDAMENTAUX                                                       */
/* -------------------------------------------------------------------------- */

export type {
  RealtimeNodeID,
  RealtimeConnectionID,
  RealtimeChannelID,
  RealtimeClientID,
  RealtimeSessionID,
  RealtimeTransportURI,

  RealtimeProtocol,
  RealtimeConnectionState,
  RealtimeDeliveryMode,
  RealtimePriority,
  RealtimeOfflinePolicy,
  RealtimeConfidentiality,

  RealtimeQoS,
  RealtimeSecurityPolicy,
  RealtimeOfflineConfig,
  RealtimeTraceContext,

  RealtimeMessage,
  RealtimeEnvelope,
  RealtimePublishInput,
  RealtimeReadonlyMessage,
  RealtimeAck,
} from "./realtime.types";

/* -------------------------------------------------------------------------- */
/* 📣 EVENTS                                                                   */
/* -------------------------------------------------------------------------- */

export type {
  RealtimeEventID,
  RealtimeEventName,
  RealtimeEventSeverity,
  RealtimeEventTrace,
  RealtimeEventSecurity,
  RealtimeEventReplay,

  NodeStartedPayload,
  NodeStoppedPayload,
  ConnectionOpenedPayload,
  ConnectionClosedPayload,
  ConnectionFailedPayload,
  ConnectionReconnectingPayload,
  ChannelJoinedPayload,
  ChannelLeftPayload,
  MessagePublishedPayload,
  MessageReceivedPayload,
  MessageAcknowledgedPayload,
  BackpressurePayload,
  OfflineQueueFlushedPayload,
  RealtimeErrorPayload,

  NodeStartedEvent,
  NodeStoppedEvent,
  ConnectionOpenedEvent,
  ConnectionClosedEvent,
  ConnectionFailedEvent,
  ConnectionReconnectingEvent,
  ChannelJoinedEvent,
  ChannelLeftEvent,
  MessagePublishedEvent,
  MessageReceivedEvent,
  MessageAcknowledgedEvent,
  BackpressureEvent,
  OfflineQueueFlushedEvent,
  RealtimeErrorEvent,

  RealtimeEvent,
} from "./realtime.events";

export {
  RealtimeEventFactory,
} from "./realtime.events";

/* -------------------------------------------------------------------------- */
/* 📡 CHANNEL                                                                  */
/* -------------------------------------------------------------------------- */

export type {
  RealtimeChannelMetrics,
  RealtimeChannelConfig,
} from "./realtime.channel.model";

export {
  RealtimeChannel,
  RealtimeChannelError,
} from "./realtime.channel.model";

/* -------------------------------------------------------------------------- */
/* 🌐 GATEWAY                                                                  */
/* -------------------------------------------------------------------------- */

export type {
  RealtimeGatewayObserver,
  RealtimeGateway,
} from "./realtime.gateway.interface";

export {
  RealtimeGatewayError,
} from "./realtime.gateway.interface";

/* -------------------------------------------------------------------------- */
/* 🔌 ADAPTER                                                                  */
/* -------------------------------------------------------------------------- */

export type {
  RealtimeAdapterObserver,
  RealtimeAdapterOptions,
  RealtimeAdapter,
} from "./realtime.adapter.interface";

export {
  RealtimeAdapterError,
} from "./realtime.adapter.interface";

/* -------------------------------------------------------------------------- */
/* 🚀 SERVICE                                                                  */
/* -------------------------------------------------------------------------- */

export type {
  RealtimeServiceObserver,
  RealtimeServiceConfig,
} from "./realtime.service";

export {
  RealtimeService,
  RealtimeServiceError,
} from "./realtime.service";

/* -------------------------------------------------------------------------- */
/* 🔌 TRANSPORT ADAPTERS                                                       */
/* -------------------------------------------------------------------------- */

export {
  WebSocketRealtimeAdapter,
  WebRTCRealtimeAdapter,
  MQTTRealtimeAdapter,
} from "./adapters";

export type {
  WebSocketFactory,
  WebSocketLike,
  WebRTCEngine,
  WebRTCPeer,
  WebRTCDataChannel,
  MQTTClient,
} from "./adapters";

/* -------------------------------------------------------------------------- */
/* 🧭 VERSIONING & CONTRACT                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Version publique du contrat Realtime Core.
 * Permet de tracer les breaking changes à long terme.
 */
export const REALTIME_CORE_VERSION = "1.0.0";

/**
 * Namespace canonique (logs, metrics, audit).
 */
export const REALTIME_CORE_NAMESPACE = "core.realtime";

/* -------------------------------------------------------------------------- */
/* 🧪 GOVERNANCE NOTE                                                          */
/* -------------------------------------------------------------------------- */
/*
RÈGLE ABSOLUE :

Ne jamais importer un fichier interne directement.

Toujours importer via :

  import { RealtimeService } from "@/core/realtime";

Cela garantit :
✔ stabilité
✔ encapsulation
✔ compatibilité future
✔ gouvernance du socle
*/
