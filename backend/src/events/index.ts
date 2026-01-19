/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE EVENTS — PUBLIC EXPORT HUB (WORLD #1 FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/events/index.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for the global event system                   */
/*   - Enforce architectural boundaries                                       */
/*   - Prevent deep imports                                                    */
/*   - Stabilize long-term contracts                                           */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Explicit exports only                                                  */
/*   - No circular dependencies                                               */
/*   - Type-safe contracts                                                    */
/*   - Engine encapsulation                                                   */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* EVENT BUS                                                                  */
/* -------------------------------------------------------------------------- */

export {
  publish,
  subscribe,
  unsubscribe,
  useEventMiddleware,
} from "./event.bus";

/* -------------------------------------------------------------------------- */
/* EVENT STORE                                                                */
/* -------------------------------------------------------------------------- */

export {
  replayEvents,
  getEventStoreStats,
  clearEventStore,
} from "./event.store";

/* -------------------------------------------------------------------------- */
/* EVENT TYPES                                                                */
/* -------------------------------------------------------------------------- */

export type {
  BaseEvent,
  EventMeta,
  EventPayload,
  EventHandler,
  EventFilter,
  EventAck,
  SerializedEvent,
  EventCategory,
  EventSeverity,
} from "./event.types";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules across the codebase:

  ✅ Always import event system APIs from:
        import { publish, subscribe } from "@/events";

  ❌ Never deep import:
        "@/events/event.bus"
        "@/events/event.store"
        "@/events/event.types"

  This guarantees:
   - Stable public contracts
   - Clean dependency graph
   - Safe refactors
   - Predictable system evolution
*/
