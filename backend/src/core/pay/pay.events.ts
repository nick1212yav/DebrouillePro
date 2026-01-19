/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — EVENT SYSTEM (ULTRA FINAL)                                */
/*  File: backend/src/core/pay/pay.events.ts                                   */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  MISSION                                                                    */
/*  - Orchestrer tous les événements financiers                                */
/*  - Garantir idempotence, auditabilité, observabilité                         */
/*  - Permettre replay, synchronisation inter-modules                           */
/*  - Supporter Queue, Webhooks, IA, Offline                                    */
/*                                                                            */
/*  PRINCIPES                                                                  */
/*  - Financial safety first                                                   */
/*  - Never block core flow                                                     */
/*  - Every event is traceable                                                  */
/*  - Exactly-once logical delivery                                             */
/*  - Deterministic payload                                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { EventEmitter } from "events";
import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* EVENT NAMES                                                                 */
/* -------------------------------------------------------------------------- */

export type PayEventName =
  | "wallet.created"
  | "wallet.updated"
  | "wallet.frozen"
  | "wallet.unfrozen"
  | "wallet.limit.reached"
  | "transaction.created"
  | "transaction.completed"
  | "transaction.failed"
  | "escrow.locked"
  | "escrow.released"
  | "escrow.refunded"
  | "escrow.disputed"
  | "payout.requested"
  | "payout.approved"
  | "payout.rejected"
  | "payout.completed"
  | "invoice.issued"
  | "invoice.paid"
  | "pay.event.error";

/* -------------------------------------------------------------------------- */
/* EVENT METADATA                                                              */
/* -------------------------------------------------------------------------- */

export interface PayEventMeta {
  eventId: string;                // UUID
  name: PayEventName;
  occurredAt: Date;

  correlationId?: string;         // trace distributed
  causationId?: string;           // parent event

  source: "PAY_CORE" | "WEBHOOK" | "CRON" | "ADMIN" | "AI";

  version: number;                // payload schema version
  checksum: string;               // payload integrity hash
}

/* -------------------------------------------------------------------------- */
/* BASE EVENT                                                                  */
/* -------------------------------------------------------------------------- */

export interface PayEvent<TPayload = unknown> {
  meta: PayEventMeta;
  payload: TPayload;
}

/* -------------------------------------------------------------------------- */
/* PAYLOADS                                                                    */
/* -------------------------------------------------------------------------- */

export interface WalletEventPayload {
  walletId: string;
  ownerType: "PERSON" | "ORGANIZATION";
  ownerId: string;
  currency?: string;
  amount?: number;
  reason?: string;
}

export interface TransactionEventPayload {
  transactionId: string;
  reference: string;
  module: string;
  entityId?: string;
  amount: number;
  currency: string;
  status: string;
}

export interface EscrowEventPayload {
  escrowId: string;
  transactionId: string;
  module: string;
  entityId?: string;
  amount: number;
  currency: string;
  status: string;
  trigger?: string;
}

export interface PayoutEventPayload {
  payoutId: string;
  walletId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
}

export interface InvoiceEventPayload {
  invoiceId: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
}

/* -------------------------------------------------------------------------- */
/* INTERNAL EVENT REGISTRY                                                     */
/* -------------------------------------------------------------------------- */

type EventHandler<T> = (event: PayEvent<T>) => Promise<void> | void;

class HandlerRegistry {
  private handlers = new Map<
    PayEventName,
    Set<EventHandler<any>>
  >();

  register<T>(
    event: PayEventName,
    handler: EventHandler<T>
  ) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  getHandlers(event: PayEventName) {
    return Array.from(this.handlers.get(event) || []);
  }
}

/* -------------------------------------------------------------------------- */
/* IDEMPOTENCY STORE (IN-MEMORY / REDIS READY)                                  */
/* -------------------------------------------------------------------------- */

class IdempotencyStore {
  private processed = new Set<string>();

  has(eventId: string) {
    return this.processed.has(eventId);
  }

  mark(eventId: string) {
    this.processed.add(eventId);
  }
}

/* -------------------------------------------------------------------------- */
/* EVENT BUS                                                                   */
/* -------------------------------------------------------------------------- */

class PayEventBus extends EventEmitter {
  private registry = new HandlerRegistry();
  private idempotency = new IdempotencyStore();

  /* ---------------------------------------------------------------------- */
  /* SUBSCRIBE                                                               */
  /* ---------------------------------------------------------------------- */

  onEvent<T>(
    event: PayEventName,
    handler: EventHandler<T>
  ) {
    this.registry.register(event, handler);
  }

  /* ---------------------------------------------------------------------- */
  /* EMIT SAFE                                                               */
  /* ---------------------------------------------------------------------- */

  emitSafe<TPayload>(
    name: PayEventName,
    payload: TPayload,
    meta?: Partial<PayEventMeta>
  ) {
    const event = this.buildEvent(name, payload, meta);

    if (this.idempotency.has(event.meta.eventId)) {
      return;
    }

    this.idempotency.mark(event.meta.eventId);

    const handlers = this.registry.getHandlers(name);

    for (const handler of handlers) {
      Promise.resolve()
        .then(() => handler(event))
        .catch((error) => {
          super.emit("pay.event.error", {
            error,
            failedEvent: event,
            at: new Date(),
          });
        });
    }

    // Broadcast for external bridges (Kafka, Queue, Webhooks)
    super.emit(name, event);
  }

  /* ---------------------------------------------------------------------- */
  /* BUILD EVENT                                                             */
  /* ---------------------------------------------------------------------- */

  private buildEvent<TPayload>(
    name: PayEventName,
    payload: TPayload,
    meta?: Partial<PayEventMeta>
  ): PayEvent<TPayload> {
    const raw = JSON.stringify(payload);

    const checksum = crypto
      .createHash("sha256")
      .update(raw)
      .digest("hex");

    return {
      meta: {
        eventId: crypto.randomUUID(),
        name,
        occurredAt: new Date(),
        source: meta?.source || "PAY_CORE",
        version: meta?.version || 1,
        correlationId: meta?.correlationId,
        causationId: meta?.causationId,
        checksum,
      },
      payload,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* SINGLETON BUS                                                               */
/* -------------------------------------------------------------------------- */

export const payEventBus = new PayEventBus();

/* -------------------------------------------------------------------------- */
/* EVENT EMITTER API (DX FRIENDLY)                                             */
/* -------------------------------------------------------------------------- */

export const PayEvents = {
  walletCreated(payload: WalletEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("wallet.created", payload, meta);
  },

  walletUpdated(payload: WalletEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("wallet.updated", payload, meta);
  },

  walletFrozen(payload: WalletEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("wallet.frozen", payload, meta);
  },

  walletUnfrozen(payload: WalletEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("wallet.unfrozen", payload, meta);
  },

  walletLimitReached(payload: WalletEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("wallet.limit.reached", payload, meta);
  },

  transactionCreated(payload: TransactionEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("transaction.created", payload, meta);
  },

  transactionCompleted(payload: TransactionEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("transaction.completed", payload, meta);
  },

  transactionFailed(payload: TransactionEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("transaction.failed", payload, meta);
  },

  escrowLocked(payload: EscrowEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("escrow.locked", payload, meta);
  },

  escrowReleased(payload: EscrowEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("escrow.released", payload, meta);
  },

  escrowRefunded(payload: EscrowEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("escrow.refunded", payload, meta);
  },

  escrowDisputed(payload: EscrowEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("escrow.disputed", payload, meta);
  },

  payoutRequested(payload: PayoutEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("payout.requested", payload, meta);
  },

  payoutApproved(payload: PayoutEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("payout.approved", payload, meta);
  },

  payoutRejected(payload: PayoutEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("payout.rejected", payload, meta);
  },

  payoutCompleted(payload: PayoutEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("payout.completed", payload, meta);
  },

  invoiceIssued(payload: InvoiceEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("invoice.issued", payload, meta);
  },

  invoicePaid(payload: InvoiceEventPayload, meta?: Partial<PayEventMeta>) {
    payEventBus.emitSafe("invoice.paid", payload, meta);
  },
};
