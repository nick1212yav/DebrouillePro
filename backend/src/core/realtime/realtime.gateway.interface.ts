/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — GATEWAY INTERFACE                                        */
/*  File: core/realtime/realtime.gateway.interface.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌐 Network Boundary • Secure • Observable • Vendor Free                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  RealtimeChannelID,
  RealtimeMessage,
  RealtimeConnectionID,
  RealtimeConnectionState,
  RealtimeAck,
  RealtimeClientID,
  RealtimeProtocol,
} from "./realtime.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class RealtimeGatewayError extends Error {
  constructor(message: string) {
    super(`[RealtimeGateway] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface RealtimeGatewayObserver {
  onConnect?(
    connectionId: RealtimeConnectionID,
    protocol: RealtimeProtocol
  ): void;

  onDisconnect?(
    connectionId: RealtimeConnectionID,
    state: RealtimeConnectionState
  ): void;

  onMessage?(message: RealtimeMessage): void;

  onAck?(ack: RealtimeAck): void;

  onError?(error: Error): void;

  onBackpressure?(queueSize: number): void;
}

/* -------------------------------------------------------------------------- */
/* 🌐 GATEWAY INTERFACE                                                        */
/* -------------------------------------------------------------------------- */

export interface RealtimeGateway {
  readonly protocol: RealtimeProtocol;

  /* ------------------------------------------------------------------------ */
  /* 🔌 CONNECTION LIFECYCLE                                                   */
  /* ------------------------------------------------------------------------ */

  connect(
    clientId?: RealtimeClientID,
    observer?: RealtimeGatewayObserver
  ): Promise<RealtimeConnectionID>;

  disconnect(connectionId: RealtimeConnectionID): Promise<void>;

  getConnectionState(
    connectionId: RealtimeConnectionID
  ): RealtimeConnectionState;

  /* ------------------------------------------------------------------------ */
  /* 📡 CHANNEL MANAGEMENT                                                     */
  /* ------------------------------------------------------------------------ */

  subscribe(
    connectionId: RealtimeConnectionID,
    channel: RealtimeChannelID
  ): Promise<void>;

  unsubscribe(
    connectionId: RealtimeConnectionID,
    channel: RealtimeChannelID
  ): Promise<void>;

  /* ------------------------------------------------------------------------ */
  /* 📤 PUBLISH                                                                */
  /* ------------------------------------------------------------------------ */

  publish<T>(
    connectionId: RealtimeConnectionID,
    message: RealtimeMessage<T>
  ): Promise<void>;

  /* ------------------------------------------------------------------------ */
  /* ✅ ACKNOWLEDGEMENTS                                                        */
  /* ------------------------------------------------------------------------ */

  acknowledge(
    connectionId: RealtimeConnectionID,
    ack: RealtimeAck
  ): Promise<void>;

  /* ------------------------------------------------------------------------ */
  /* ♻️ RESILIENCE                                                             */
  /* ------------------------------------------------------------------------ */

  flushOfflineQueue?(
    connectionId: RealtimeConnectionID
  ): Promise<void>;

  healthCheck(): Promise<boolean>;
}
