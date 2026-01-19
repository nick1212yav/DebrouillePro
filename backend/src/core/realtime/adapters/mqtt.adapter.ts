/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — MQTT ADAPTER                                             */
/*  File: core/realtime/adapters/mqtt.adapter.ts                              */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📡 IoT • Low Bandwidth • Offline Ready • Observable                        */
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
/* 🌐 MQTT CLIENT ABSTRACTION                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Interface minimale MQTT injectable.
 * Peut être implémentée via :
 *  - mqtt.js
 *  - broker embarqué
 *  - sdk mobile
 */
export interface MQTTClient {
  connect(uri: string): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, payload: Uint8Array): Promise<void>;
  subscribe(topic: string): Promise<void>;

  onMessage?(handler: (topic: string, payload: Uint8Array) => void): void;
  onClose?(handler: () => void): void;
  onError?(handler: (err: Error) => void): void;
}

/* -------------------------------------------------------------------------- */
/* ⚡ MQTT ADAPTER                                                             */
/* -------------------------------------------------------------------------- */

export class MQTTRealtimeAdapter implements RealtimeAdapter {
  readonly protocol: RealtimeProtocol = "mqtt";

  private observer?: RealtimeAdapterObserver;
  private state: RealtimeConnectionState = "idle";
  private bufferedBytes: Bytes = 0;

  constructor(
    private readonly client: MQTTClient
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔗 CONNECTION                                                             */
  /* ------------------------------------------------------------------------ */

  async connect(
    options: RealtimeAdapterOptions,
    observer?: RealtimeAdapterObserver
  ): Promise<void> {
    this.observer = observer;
    this.state = "connecting";

    try {
      await this.client.connect(options.uri);

      this.client.onMessage?.((topic, payload) => {
        const envelope: RealtimeEnvelope = {
          protocol: "mqtt",
          transportUri: topic,
          raw: payload,
          receivedAt: Date.now(),
        };
        this.observer?.onMessage?.(envelope);
      });

      this.client.onClose?.(() => {
        this.state = "disconnected";
        this.observer?.onClose?.("closed");
      });

      this.client.onError?.((err) => {
        this.observer?.onError?.(err);
      });

      this.state = "connected";
      this.observer?.onOpen?.();
    } catch (err: any) {
      this.state = "failed";
      this.observer?.onError?.(err);
      throw new RealtimeAdapterError(err.message);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this.state = "disconnected";
  }

  getState(): RealtimeConnectionState {
    return this.state;
  }

  /* ------------------------------------------------------------------------ */
  /* 📤 SEND                                                                   */
  /* ------------------------------------------------------------------------ */

  async send(data: Uint8Array): Promise<void> {
    if (this.state !== "connected") {
      throw new RealtimeAdapterError("MQTT not connected");
    }

    this.bufferedBytes += data.byteLength;
    await this.client.publish("realtime", data);
    this.bufferedBytes -= data.byteLength;
  }

  getBufferedAmount(): Bytes {
    return this.bufferedBytes;
  }

  /* ------------------------------------------------------------------------ */
  /* 🩺 HEALTH                                                                 */
  /* ------------------------------------------------------------------------ */

  async healthCheck(): Promise<boolean> {
    return this.state === "connected";
  }
}
