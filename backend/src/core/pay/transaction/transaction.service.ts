/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — TRANSACTION SERVICE (OFFICIAL FINAL — LOCKED)            */
/* -------------------------------------------------------------------------- */

import mongoose, {
  ClientSession,
  HydratedDocument,
} from "mongoose";
import crypto from "crypto";

import { TransactionModel } from "./transaction.model";
import {
  WalletModel,
  WalletHydratedDocument,
} from "../wallet/wallet.model";

import {
  CreateTransactionCommand,
  TransactionViewDTO,
  TransactionEventPayload,
  TransactionEventType,
  TransactionLegDTO,
  TransactionStatus,
  TransactionDirection,
  TransactionNature,
  TransactionActorType,
} from "./transaction.types";

import { TransactionDocument } from "./transaction.model";

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

const generateReference = (): string =>
  `TX-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

const generateSequence = (): number => Date.now();

const nowISO = (): string => new Date().toISOString();

/* -------------------------------------------------------------------------- */
/* SAFE MAPPER — DOCUMENT → DTO                                               */
/* -------------------------------------------------------------------------- */

type TransactionHydrated =
  HydratedDocument<TransactionDocument>;

function mapTransactionToDTO(
  doc: TransactionHydrated
): TransactionViewDTO {
  const obj = doc.toObject({
    virtuals: true,
  }) as TransactionDocument & {
    _id: mongoose.Types.ObjectId;
  };

  return {
    id: obj._id.toString(),
    reference: String(obj.reference),

    direction: obj.direction,
    nature: obj.nature,
    status: obj.status as TransactionStatus,

    legs: obj.legs.map<TransactionLegDTO>((leg) => ({
      legId: leg.legId,

      from: leg.from
        ? {
            walletId: leg.from.walletId?.toString(),
            ownerType:
              leg.from.ownerType as TransactionActorType,
            ownerId: leg.from.ownerId?.toString(),
            label: leg.from.label,
          }
        : undefined,

      to: leg.to
        ? {
            walletId: leg.to.walletId?.toString(),
            ownerType:
              leg.to.ownerType as TransactionActorType,
            ownerId: leg.to.ownerId?.toString(),
            label: leg.to.label,
          }
        : undefined,

      amounts: {
        ...leg.amounts,
      },
    })),

    referenceContext: obj.referenceContext,
    risk: obj.risk,
    meta: obj.meta,

    createdAt: obj.createdAt
      ? new Date(obj.createdAt).toISOString()
      : nowISO(),

    updatedAt: undefined,

    completedAt: obj.completedAt
      ? new Date(obj.completedAt).toISOString()
      : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* EVENT BUS (PLACEHOLDER)                                                    */
/* -------------------------------------------------------------------------- */

class EventBus {
  static async publish(
    event: TransactionEventPayload
  ): Promise<void> {
    console.log(
      "📣 EVENT:",
      event.type,
      event.transaction.id
    );
  }
}

/* -------------------------------------------------------------------------- */
/* LOCK MANAGER (ANTI DOUBLE-SPEND)                                            */
/* -------------------------------------------------------------------------- */

class WalletLockManager {
  private static locks = new Set<string>();

  static async lock(walletId: string) {
    if (this.locks.has(walletId)) {
      throw new Error(
        `Wallet locked (concurrent mutation): ${walletId}`
      );
    }
    this.locks.add(walletId);
  }

  static release(walletId: string) {
    this.locks.delete(walletId);
  }
}

/* -------------------------------------------------------------------------- */
/* BALANCE ENGINE                                                             */
/* -------------------------------------------------------------------------- */

class BalanceEngine {
  static applyLeg(
    wallet: WalletHydratedDocument,
    leg: TransactionLegDTO,
    direction: "DEBIT" | "CREDIT"
  ): void {
    const balance = wallet.balances.find(
      (b) => b.currency === leg.amounts.currency
    );

    if (!balance) {
      throw new Error(
        `Currency ${leg.amounts.currency} not found in wallet ${wallet._id.toString()}`
      );
    }

    const amount = leg.amounts.netAmount;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(
        `Invalid transaction amount: ${amount}`
      );
    }

    if (direction === "DEBIT") {
      if (balance.available < amount) {
        throw new Error("Insufficient funds for debit");
      }
      balance.available -= amount;
    }

    if (direction === "CREDIT") {
      balance.available += amount;
    }

    if (balance.available < 0) {
      throw new Error(
        "Ledger invariant violated (negative balance)"
      );
    }

    balance.updatedAt = new Date();
  }
}

/* -------------------------------------------------------------------------- */
/* TRANSACTION SERVICE                                                        */
/* -------------------------------------------------------------------------- */

export class TransactionService {
  /* ======================================================================== */
  /* CREATE TRANSACTION                                                       */
  /* ======================================================================== */

  static async create(
    command: CreateTransactionCommand
  ): Promise<TransactionViewDTO> {
    const session: ClientSession =
      await mongoose.startSession();

    const lockedWallets = new Set<string>();
    session.startTransaction();

    try {
      /* ------------------------------------------------------------------ */
      /* IDEMPOTENCY                                                        */
      /* ------------------------------------------------------------------ */

      if (command.reference) {
        const existing =
          await TransactionModel.findOne({
            reference: command.reference,
          }).session(session);

        if (existing) {
          return mapTransactionToDTO(existing);
        }
      }

      /* ------------------------------------------------------------------ */
      /* LOCK WALLETS                                                       */
      /* ------------------------------------------------------------------ */

      const walletIds = new Set<string>();

      for (const leg of command.legs) {
        if (leg.from?.walletId) {
          walletIds.add(leg.from.walletId);
        }
        if (leg.to?.walletId) {
          walletIds.add(leg.to.walletId);
        }
      }

      for (const walletId of walletIds) {
        await WalletLockManager.lock(walletId);
        lockedWallets.add(walletId);
      }

      /* ------------------------------------------------------------------ */
      /* LOAD WALLETS                                                       */
      /* ------------------------------------------------------------------ */

      const wallets =
        await WalletModel.find({
          _id: { $in: Array.from(walletIds) },
        }).session(session);

      const walletMap = new Map<
        string,
        WalletHydratedDocument
      >();

      for (const wallet of wallets) {
        walletMap.set(wallet._id.toString(), wallet);
      }

      for (const walletId of walletIds) {
        if (!walletMap.has(walletId)) {
          throw new Error(`Wallet not found: ${walletId}`);
        }
      }

      /* ------------------------------------------------------------------ */
      /* APPLY LEDGER MUTATIONS                                             */
      /* ------------------------------------------------------------------ */

      for (const leg of command.legs) {
        if (leg.from?.walletId) {
          const wallet = walletMap.get(
            leg.from.walletId
          )!;
          BalanceEngine.applyLeg(wallet, leg, "DEBIT");
        }

        if (leg.to?.walletId) {
          const wallet = walletMap.get(
            leg.to.walletId
          )!;
          BalanceEngine.applyLeg(wallet, leg, "CREDIT");
        }
      }

      /* ------------------------------------------------------------------ */
      /* PERSIST WALLETS                                                    */
      /* ------------------------------------------------------------------ */

      for (const wallet of walletMap.values()) {
        await wallet.save({ session });
      }

      /* ------------------------------------------------------------------ */
      /* CREATE TRANSACTION                                                 */
      /* ------------------------------------------------------------------ */

      const [created] =
        await TransactionModel.create(
          [
            {
              reference:
                command.reference || generateReference(),

              sequence: generateSequence(),

              direction: command.direction,
              nature: command.nature,
              status: TransactionStatus.COMPLETED,

              legs: command.legs,
              referenceContext: command.referenceContext,
              meta: command.meta,

              audit: {
                immutableHash: "__AUTO__",
              },

              processedAt: new Date(),
              completedAt: new Date(),
            },
          ],
          { session }
        );

      if (!created) {
        throw new Error("Transaction creation failed");
      }

      await session.commitTransaction();

      const transactionView =
        mapTransactionToDTO(created);

      /* ------------------------------------------------------------------ */
      /* EMIT EVENT                                                         */
      /* ------------------------------------------------------------------ */

      await EventBus.publish({
        eventId: crypto.randomUUID(),
        type: TransactionEventType.TRANSACTION_COMPLETED,
        transaction: transactionView,
        occurredAt: nowISO(),
        source: "PAY_CORE",
      });

      return transactionView;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();

      for (const walletId of lockedWallets) {
        WalletLockManager.release(walletId);
      }
    }
  }

  /* ======================================================================== */
  /* REVERSE TRANSACTION                                                      */
  /* ======================================================================== */

  static async reverse(params: {
    originalTransactionId: string;
    reason: string;
  }): Promise<TransactionViewDTO> {
    const original =
      await TransactionModel.findById(
        params.originalTransactionId
      );

    if (!original) {
      throw new Error("Original transaction not found");
    }

    const reversedLegs: TransactionLegDTO[] =
      original.legs.map((leg) => ({
        legId: crypto.randomUUID(),

        from: leg.to
          ? {
              walletId: leg.to.walletId?.toString(),
              ownerType:
                leg.to.ownerType as TransactionActorType,
              ownerId: leg.to.ownerId?.toString(),
              label: leg.to.label,
            }
          : undefined,

        to: leg.from
          ? {
              walletId: leg.from.walletId?.toString(),
              ownerType:
                leg.from.ownerType as TransactionActorType,
              ownerId: leg.from.ownerId?.toString(),
              label: leg.from.label,
            }
          : undefined,

        amounts: {
          ...leg.amounts,
        },
      }));

    return TransactionService.create({
      reference: `REV-${original.reference}`,
      direction: TransactionDirection.INTERNAL,
      nature: TransactionNature.REVERSAL,
      legs: reversedLegs,
      referenceContext: {
        module: "pay",
        entityId: original._id.toString(),
        action: "reverse",
      },
      meta: {
        initiatedBy: "SYSTEM",
        notes: params.reason,
      },
    });
  }

  /* ======================================================================== */
  /* READ MODEL                                                               */
  /* ======================================================================== */

  static async getById(
    transactionId: string
  ): Promise<TransactionViewDTO | null> {
    const tx =
      await TransactionModel.findById(transactionId);

    return tx ? mapTransactionToDTO(tx) : null;
  }

  static async getByReference(
    reference: string
  ): Promise<TransactionViewDTO | null> {
    const tx =
      await TransactionModel.findOne({ reference });

    return tx ? mapTransactionToDTO(tx) : null;
  }

  /* ======================================================================== */
  /* HEALTH                                                                   */
  /* ======================================================================== */

  static async health() {
    return {
      service: "TransactionService",
      status: "OK",
      timestamp: nowISO(),
    };
  }
}
