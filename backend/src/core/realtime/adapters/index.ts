/* -------------------------------------------------------------------------- */
/*  CORE / REALTIME — ADAPTERS EXPORT HUB                                      */
/*  File: core/realtime/adapters/index.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Central export point for all realtime transport adapters                */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 🌐 TRANSPORT ADAPTERS                                                      */
/* -------------------------------------------------------------------------- */

export {
  WebSocketRealtimeAdapter,
  type WebSocketFactory,
  type WebSocketLike,
} from "./websocket.adapter";

export {
  WebRTCRealtimeAdapter,
  type WebRTCEngine,
  type WebRTCPeer,
  type WebRTCDataChannel,
} from "./webrtc.adapter";

export {
  MQTTRealtimeAdapter,
  type MQTTClient,
} from "./mqtt.adapter";

/* -------------------------------------------------------------------------- */
/* 🔮 FUTURE EXTENSIONS                                                        */
/* -------------------------------------------------------------------------- */
/*
export { QuicRealtimeAdapter } from "./quic.adapter";
export { BluetoothRealtimeAdapter } from "./bluetooth.adapter";
export { SatelliteRealtimeAdapter } from "./satellite.adapter";
*/
