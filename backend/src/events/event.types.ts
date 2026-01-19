/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE EVENTS — EVENT TYPES (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/events/event.types.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Define the universal contract for all system events                    */
/*   - Guarantee long-term compatibility and replayability                    */
/*   - Enable audit, analytics, AI learning and observability                 */
/*   - Enforce strict typing across producers and consumers                   */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Strong typing                                                         */
/*   - Immutable event schema                                                 */
/*   - Versioned payloads                                                     */
/*   - Deterministic serialization                                            */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* EVENT CATEGORIES                                                           */
/* -------------------------------------------------------------------------- */

/**
 * High-level classification of events.
 * Used for routing, analytics and governance.
 */
export type EventCategory =
  | "system"
  | "security"
  | "identity"
  | "payment"
  | "trust"
  | "audit"
  | "ai"
  | "business"
  | "integration";

/* -------------------------------------------------------------------------- */
/* EVENT SEVERITY                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Severity level of an event.
 * Allows prioritization and alerting.
 */
export type EventSeverity =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

/* -------------------------------------------------------------------------- */
/* EVENT METADATA                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Metadata attached to every event.
 * This block is immutable and must always be present.
 */
export interface EventMeta {
  /**
   * Unique event identifier (UUID).
   */
  id: string;

  /**
   * Event creation timestamp (epoch ms).
   */
  timestamp: number;

  /**
   * Logical name of the event.
   * Example: "user.created", "payment.succeeded"
   */
  name: string;

  /**
   * Event category.
   */
  category: EventCategory;

  /**
   * Severity of the event.
   */
  severity: EventSeverity;

  /**
   * Schema version of the payload.
   * Enables backward compatibility and migrations.
   */
  version: number;

  /**
   * Correlation identifiers for tracing.
   */
  correlation?: {
    requestId?: string;
    sessionId?: string;
    traceId?: string;
    parentEventId?: string;
  };

  /**
   * Producer service or module.
   * Example: "auth-service", "pay-engine"
   */
  source: string;

  /**
   * Optional tags for indexing and filtering.
   */
  tags?: string[];
}

/* -------------------------------------------------------------------------- */
/* EVENT PAYLOAD                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Generic payload container.
 * Each event defines its own payload shape.
 */
export type EventPayload = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* BASE EVENT                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Canonical event structure shared by all events in the system.
 */
export interface BaseEvent<TPayload = EventPayload> {
  meta: EventMeta;
  payload: TPayload;
}

/* -------------------------------------------------------------------------- */
/* EVENT HANDLER                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Handler signature for event consumers.
 */
export type EventHandler<TPayload = EventPayload> = (
  event: BaseEvent<TPayload>
) => Promise<void> | void;

/* -------------------------------------------------------------------------- */
/* EVENT FILTER                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Optional filter predicate used by subscribers.
 */
export type EventFilter = (event: BaseEvent) => boolean;

/* -------------------------------------------------------------------------- */
/* EVENT ACKNOWLEDGEMENT                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Acknowledgement returned by the event bus after publish.
 */
export interface EventAck {
  eventId: string;
  accepted: boolean;
  publishedAt: number;
}

/* -------------------------------------------------------------------------- */
/* EVENT SERIALIZATION                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Serialized form used for persistence or transport.
 */
export interface SerializedEvent {
  meta: EventMeta;
  payload: string; // JSON string
}
