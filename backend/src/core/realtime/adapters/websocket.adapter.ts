/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — WEBSOCKET ADAPTER                                        */
/*  File: core/realtime/adapters/websocket.adapter.ts                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  🌐 Browser • Node • Edge • Auto-Reconnect • Heartbeat • Observable         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  RealtimeAdapter,
  RealtimeAdapterOptions,
  RealtimeAdapterObserver,
  RealtimeAdapterError,
} from "../realtime.adapter.interface";

import {
  RealtimeProtocol,
  RealtimeEnvelope,
  RealtimeConnectionState,
  Bytes,
} from "../realtime.types";

/* -------------------------------------------------------------------------- */
/* 🌐 WEBSOCKET FACTORY ABSTRACTION                                             */
/* -------------------------------------------------------------------------- */

/**
 * Injection abstraction to support:
 * - Browser WebSocket
 * - ws (node)
 * - custom polyfills
 */
export interface WebSocketFactory {
  create(url: string): WebSocketLike;
}

export interface WebSocketLike {
  send(data: Uint8Array): void;
  close(): void;
  readyState: number;

  onopen?: () => void;
  onclose?: (ev?: any) => void;
  onerror?: (err: any) => void;
  onmessage?: (event: { data: ArrayBuffer | Uint8Array | string }) => void;
}

/* -------------------------------------------------------------------------- */
/* 🧠 INTERNAL CONSTANTS                                                       */
/* -------------------------------------------------------------------------- */

const WS_OPEN = 1;

/* -------------------------------------------------------------------------- */
/* ⚡ WEBSOCKET ADAPTER                                                         */
/* -------------------------------------------------------------------------- */

export class WebSocketRealtimeAdapter implements RealtimeAdapter {
  readonly protocol: RealtimeProtocol = "websocket";

  private socket?: WebSocketLike;
  private state: RealtimeConnectionState = "idle";
  private observer?: RealtimeAdapterObserver;
  private options?: RealtimeAdapterOptions;

  private heartbeatTimer?: any;
  private reconnectTimer?: any;

  private bufferedBytes: Bytes = 0;

  constructor(
    private readonly factory: WebSocketFactory
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔗 CONNECTION                                                             */
  /* ------------------------------------------------------------------------ */

  async connect(
    options: RealtimeAdapterOptions,
    observer?: RealtimeAdapterObserver
  ): Promise<void> {
    this.options = options;
    this.observer = observer;
    this.state = "connecting";

    this.openSocket();
  }

  private openSocket() {
    if (!this.options) return;

    try {
      this.socket = this.factory.create(this.options.uri);

      this.socket.onopen = () => {
        this.state = "connected";
        this.startHeartbeat();
        this.observer?.onOpen?.();
      };

      this.socket.onmessage = (event) => {
        const raw =
          typeof event.data === "string"
            ? new TextEncoder().encode(event.data)
            : event.data instanceof ArrayBuffer
            ? new Uint8Array(event.data)
            : event.data;

        const envelope: RealtimeEnvelope = {
          protocol: "websocket",
          raw,
          receivedAt: Date.now(),
        };

        this.observer?.onMessage?.(envelope);
      };

      this.socket.onerror = (err) => {
        this.observer?.onError?.(
          new RealtimeAdapterError("WebSocket error")
        );
      };

      this.socket.onclose = () => {
        this.state = "disconnected";
        this.stopHeartbeat();
        this.observer?.onClose?.("closed");

        if (this.options?.reconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (err: any) {
      this.state = "failed";
      this.observer?.onError?.(err);
    }
  }

  async disconnect(): Promise<void> {
    this.options = undefined;
    this.stopHeartbeat();
    this.socket?.close();
    this.state = "disconnected";
  }

  getState(): RealtimeConnectionState {
    return this.state;
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 SEND                                                                   */
  /* ------------------------------------------------------------------------ */

  async send(data: Uint8Array): Promise<void> {
    if (!this.socket || this.socket.readyState !== WS_OPEN) {
      throw new RealtimeAdapterError("Socket not connected");
    }

    this.bufferedBytes += data.byteLength;
    this.socket.send(data);
    this.bufferedBytes -= data.byteLength;
  }

  getBufferedAmount(): Bytes {
    return this.bufferedBytes;
  }

  /* ------------------------------------------------------------------------ */
  /* 💓 HEARTBEAT                                                              */
  /* ------------------------------------------------------------------------ */

  private startHeartbeat() {
    const interval =
      this.options?.heartbeatIntervalMs ?? 10_000;

    this.heartbeatTimer = setInterval(() => {
      const start = Date.now();
      try {
        this.send(new Uint8Array([0])); // ping frame
        const latency = Date.now() - start;
        this.observer?.onHeartbeat?.(latency);
      } catch {
        // ignore
      }
    }, interval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ RECONNECT                                                              */
  /* ------------------------------------------------------------------------ */

  private scheduleReconnect() {
    const delay =
      this.options?.reconnectIntervalMs ?? 3_000;

    this.state = "reconnecting";

    this.reconnectTimer = setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    return this.state === "connected";
  }
}
