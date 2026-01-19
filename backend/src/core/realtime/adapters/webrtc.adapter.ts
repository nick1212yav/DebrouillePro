/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — WEBRTC ADAPTER                                           */
/*  File: core/realtime/adapters/webrtc.adapter.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📡 Peer-to-Peer • Ultra Low Latency • Secure • Mesh Ready                  */
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
/* 🌐 WEBRTC ABSTRACTION                                                       */
/* -------------------------------------------------------------------------- */

/**
 * WebRTC primitives abstraction.
 * Can be implemented by:
 *  - Browser RTCPeerConnection
 *  - React Native WebRTC
 *  - Node WebRTC
 */
export interface WebRTCEngine {
  createPeer(): WebRTCPeer;
}

export interface WebRTCPeer {
  createDataChannel(label: string): WebRTCDataChannel;
  close(): void;
}

export interface WebRTCDataChannel {
  send(data: Uint8Array): void;
  close(): void;
  bufferedAmount: Bytes;

  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (ev: { data: ArrayBuffer | Uint8Array }) => void;
  onerror?: (err: any) => void;
}

/* -------------------------------------------------------------------------- */
/* ⚡ WEBRTC ADAPTER                                                           */
/* -------------------------------------------------------------------------- */

export class WebRTCRealtimeAdapter implements RealtimeAdapter {
  readonly protocol: RealtimeProtocol = "webrtc";

  private peer?: WebRTCPeer;
  private channel?: WebRTCDataChannel;
  private observer?: RealtimeAdapterObserver;
  private state: RealtimeConnectionState = "idle";

  constructor(
    private readonly engine: WebRTCEngine
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔗 CONNECTION                                                             */
  /* ------------------------------------------------------------------------ */

  async connect(
    _options: RealtimeAdapterOptions,
    observer?: RealtimeAdapterObserver
  ): Promise<void> {
    this.observer = observer;
    this.state = "connecting";

    try {
      this.peer = this.engine.createPeer();
      this.channel = this.peer.createDataChannel("realtime");

      this.channel.onopen = () => {
        this.state = "connected";
        this.observer?.onOpen?.();
      };

      this.channel.onmessage = (ev) => {
        const raw =
          ev.data instanceof ArrayBuffer
            ? new Uint8Array(ev.data)
            : ev.data;

        const envelope: RealtimeEnvelope = {
          protocol: "webrtc",
          raw,
          receivedAt: Date.now(),
        };

        this.observer?.onMessage?.(envelope);
      };

      this.channel.onerror = (err) => {
        this.observer?.onError?.(
          new RealtimeAdapterError("WebRTC channel error")
        );
      };

      this.channel.onclose = () => {
        this.state = "disconnected";
        this.observer?.onClose?.("closed");
      };
    } catch (err: any) {
      this.state = "failed";
      this.observer?.onError?.(err);
      throw new RealtimeAdapterError(err.message);
    }
  }

  async disconnect(): Promise<void> {
    this.channel?.close();
    this.peer?.close();
    this.state = "disconnected";
  }

  getState(): RealtimeConnectionState {
    return this.state;
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 SEND                                                                   */
  /* ------------------------------------------------------------------------ */

  async send(data: Uint8Array): Promise<void> {
    if (!this.channel) {
      throw new RealtimeAdapterError("Channel not ready");
    }
    this.channel.send(data);
  }

  getBufferedAmount(): Bytes {
    return this.channel?.bufferedAmount ?? 0;
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    return this.state === "connected";
  }
}
