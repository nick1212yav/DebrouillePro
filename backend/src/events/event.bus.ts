/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE EVENTS — EVENT BUS ENGINE (WORLD #1 FINAL)                     */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/events/event.bus.ts                                     */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Publish and dispatch domain events                                     */
/*   - Manage subscribers lifecycle                                           */
/*   - Enforce isolation and reliability                                      */
/*   - Integrate with event store                                              */
/*   - Provide deterministic acknowledgements                                 */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Type-safe contracts                                                    */
/*   - Subscriber isolation                                                   */
/*   - No event loss in memory pipeline                                       */
/*   - Extensible middleware pipeline                                         */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

import {
  BaseEvent,
  EventAck,
  EventFilter,
  EventHandler,
  EventMeta,
} from "./event.types";
import { persistEvent } from "./event.store";
import { logger } from "../shared/logger";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface Subscriber {
  id: string;
  handler: EventHandler;
  filter?: EventFilter;
}

export type EventMiddleware = (
  event: BaseEvent,
  next: () => Promise<void>
) => Promise<void>;

/* -------------------------------------------------------------------------- */
/* INTERNAL STATE                                                             */
/* -------------------------------------------------------------------------- */

const subscribers = new Map<string, Subscriber>();
const middlewares: EventMiddleware[] = [];

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const generateEventId = (): string =>
  crypto.randomUUID();

const now = (): number => Date.now();

/* -------------------------------------------------------------------------- */
/* EVENT VALIDATION                                                           */
/* -------------------------------------------------------------------------- */

const validateEvent = (event: BaseEvent): void => {
  if (!event.meta?.name) {
    throw new Error("Event.meta.name is required");
  }
  if (!event.meta?.category) {
    throw new Error("Event.meta.category is required");
  }
  if (!event.meta?.severity) {
    throw new Error("Event.meta.severity is required");
  }
  if (typeof event.meta.version !== "number") {
    throw new Error("Event.meta.version must be a number");
  }
};

/* -------------------------------------------------------------------------- */
/* MIDDLEWARE PIPELINE                                                        */
/* -------------------------------------------------------------------------- */

const executeMiddlewares = async (
  event: BaseEvent,
  index = 0
): Promise<void> => {
  const middleware = middlewares[index];
  if (!middleware) return;

  await middleware(event, async () => {
    await executeMiddlewares(event, index + 1);
  });
};

/* -------------------------------------------------------------------------- */
/* DISPATCH ENGINE                                                            */
/* -------------------------------------------------------------------------- */

const dispatchToSubscribers = async (
  event: BaseEvent
): Promise<void> => {
  const tasks = Array.from(subscribers.values()).map(
    async (subscriber) => {
      try {
        if (
          subscriber.filter &&
          !subscriber.filter(event)
        ) {
          return;
        }

        await subscriber.handler(event);
      } catch (error) {
        logger.error("❌ Event handler failure", {
          subscriberId: subscriber.id,
          event: event.meta.name,
          error,
        });
      }
    }
  );

  await Promise.allSettled(tasks);
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — SUBSCRIPTION                                                   */
/* -------------------------------------------------------------------------- */

export const subscribe = (
  handler: EventHandler,
  filter?: EventFilter
): string => {
  const id = crypto.randomUUID();

  subscribers.set(id, {
    id,
    handler,
    filter,
  });

  logger.info("📥 Event subscriber registered", {
    subscriberId: id,
  });

  return id;
};

export const unsubscribe = (subscriberId: string): void => {
  subscribers.delete(subscriberId);

  logger.info("📤 Event subscriber removed", {
    subscriberId,
  });
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — MIDDLEWARE                                                     */
/* -------------------------------------------------------------------------- */

export const useEventMiddleware = (
  middleware: EventMiddleware
): void => {
  middlewares.push(middleware);

  logger.info("🧩 Event middleware registered", {
    count: middlewares.length,
  });
};

/* -------------------------------------------------------------------------- */
/* PUBLIC API — PUBLISH                                                       */
/* -------------------------------------------------------------------------- */

export const publish = async <TPayload>(
  event: Omit<BaseEvent<TPayload>, "meta"> & {
    meta: Omit<EventMeta, "id" | "timestamp">;
  }
): Promise<EventAck> => {
  const enrichedEvent: BaseEvent<TPayload> = {
    payload: event.payload,
    meta: {
      ...event.meta,
      id: generateEventId(),
      timestamp: now(),
    },
  };

  validateEvent(enrichedEvent);

  /* ---------------------------------------------------------------------- */
  /* PERSISTENCE (EVENT STORE)                                               */
  /* ---------------------------------------------------------------------- */

  try {
    await persistEvent(enrichedEvent);
  } catch (error) {
    logger.error("❌ Failed to persist event", {
      event: enrichedEvent.meta.name,
      error,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* MIDDLEWARE PIPELINE                                                     */
  /* ---------------------------------------------------------------------- */

  await executeMiddlewares(enrichedEvent);

  /* ---------------------------------------------------------------------- */
  /* DISPATCH                                                                */
  /* ---------------------------------------------------------------------- */

  await dispatchToSubscribers(enrichedEvent);

  logger.info("📡 Event published", {
    id: enrichedEvent.meta.id,
    name: enrichedEvent.meta.name,
    category: enrichedEvent.meta.category,
  });

  return {
    eventId: enrichedEvent.meta.id,
    accepted: true,
    publishedAt: enrichedEvent.meta.timestamp,
  };
};
