/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — TRANSPORT ADAPTER INTERFACE                              */
/*  File: core/realtime/realtime.adapter.interface.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🔌 Low-level transport abstraction • Secure • Observable                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  RealtimeTransportURI,
  RealtimeProtocol,
  RealtimeEnvelope,
  RealtimeConnectionState,
  Bytes,
} from "./realtime.types";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class RealtimeAdapterError extends Error {
  constructor(message: string) {
    super(`[RealtimeAdapter] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface RealtimeAdapterObserver {
  onOpen?(): void;
  onClose?(reason?: string): void;
  onMessage?(envelope: RealtimeEnvelope): void;
  onError?(error: Error): void;
  onBackpressure?(queueSize: number): void;
  onHeartbeat?(latencyMs: number): void;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ ADAPTER OPTIONS                                                          */
/* -------------------------------------------------------------------------- */

export interface RealtimeAdapterOptions {
  uri: RealtimeTransportURI;
  protocol: RealtimeProtocol;
  reconnect?: boolean;
  reconnectIntervalMs?: number;
  heartbeatIntervalMs?: number;
  compression?: "none" | "gzip" | "brotli";
  maxQueueSize?: number;
}

/* -------------------------------------------------------------------------- */
/* 🔌 ADAPTER INTERFACE                                                        */
/* -------------------------------------------------------------------------- */

export interface RealtimeAdapter {
  readonly protocol: RealtimeProtocol;

  /* ------------------------------------------------------------------------ */
  /* 🔗 CONNECTION                                                             */
  /* ------------------------------------------------------------------------ */

  connect(
    options: RealtimeAdapterOptions,
    observer?: RealtimeAdapterObserver
  ): Promise<void>;

  disconnect(): Promise<void>;

  getState(): RealtimeConnectionState;

  /* ------------------------------------------------------------------------ */
  /* 📤 SEND / RECEIVE                                                         */
  /* ------------------------------------------------------------------------ */

  send(data: Uint8Array): Promise<void>;

  /* ------------------------------------------------------------------------ */
  /* ♻️ FLOW CONTROL                                                           */
  /* ------------------------------------------------------------------------ */

  getBufferedAmount(): Bytes;

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  healthCheck(): Promise<boolean>;
}
