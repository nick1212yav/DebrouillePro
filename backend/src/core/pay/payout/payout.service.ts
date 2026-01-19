/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — PAYOUT SERVICE (WORLD CLASS ORCHESTRATION)                */
/*  File: backend/src/core/pay/payout.service.ts                               */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE                                                                       */
/*  - Créer, valider, exécuter et tracer les payouts                            */
/*  - Garantir cohérence financière absolue                                    */
/*  - Protéger contre fraude, double spending, concurrence                     */
/*  - Orchestration Wallet + Transaction + Provider + Audit                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, { ClientSession, Types } from "mongoose";

import {
  PayoutModel,
  PayoutDocument,
  PayoutStatus,
  PayoutMethod,
} from "./payout.model";

import { WalletModel } from "../wallet/wallet.model";
import { TransactionModel } from "../transaction/transaction.model";

import { TrustService } from "../../trust/trust.service";
import { TrackingService } from "../../tracking/tracking.service";

import {
  AuditOutcome,
  AuditCategory,
} from "../../tracking/auditLog.model";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CreatePayoutInput = {
  walletId: Types.ObjectId;
  ownerType: "PERSON" | "ORGANIZATION";
  ownerId: Types.ObjectId;

  amount: number;
  currency: string;
  fee?: number;

  destination: {
    method: PayoutMethod;
    [key: string]: any;
  };

  idempotencyKey: string;

  initiatedBy: "USER" | "SYSTEM" | "ADMIN" | "AI";

  riskSnapshot: {
    trustScore: number;
    verificationLevel: number;
    velocityScore?: number;
    geoRiskScore?: number;
    amlRiskScore?: number;
    fraudSignals?: string[];
  };

  context?: {
    ipAddress?: string;
    userAgent?: string;
    module?: string;
    entityId?: string;
  };
};

export type ExecutePayoutResult = {
  payout: PayoutDocument;
  transactionId?: Types.ObjectId;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const assertWalletCanPayout = async (
  walletId: Types.ObjectId,
  amount: number,
  currency: string
) => {
  const wallet = await WalletModel.findById(walletId);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.status !== "ACTIVE") {
    throw new Error("Wallet is not active");
  }

  const balance = wallet.balances.find(
    (b) => b.currency === currency
  );

  if (!balance || balance.available < amount) {
    throw new Error("Insufficient wallet balance");
  }

  return wallet;
};

/**
 * Calcul basique de frais (placeholder IA / rules).
 */
const computeFee = (amount: number): number => {
  return Math.round(amount * 0.01 * 100) / 100; // 1%
};

/* -------------------------------------------------------------------------- */
/* PAYOUT SERVICE                                                             */
/* -------------------------------------------------------------------------- */

export class PayoutService {
  /* ======================================================================== */
  /* CREATE                                                                   */
  /* ======================================================================== */

  /**
   * Créer une demande de payout (idempotente).
   */
  static async createPayout(
    input: CreatePayoutInput
  ): Promise<PayoutDocument> {
    /* -------------------------------------------------------------------- */
    /* IDEMPOTENCY CHECK                                                    */
    /* -------------------------------------------------------------------- */

    const existing = await PayoutModel.findOne({
      "meta.idempotencyKey": input.idempotencyKey,
    });

    if (existing) {
      return existing;
    }

    /* -------------------------------------------------------------------- */
    /* WALLET VALIDATION                                                    */
    /* -------------------------------------------------------------------- */

    await assertWalletCanPayout(
      input.walletId,
      input.amount,
      input.currency
    );

    const fee =
      typeof input.fee === "number"
        ? input.fee
        : computeFee(input.amount);

    const netAmount = input.amount - fee;

    if (netAmount <= 0) {
      throw new Error("Invalid payout amount after fee");
    }

    /* -------------------------------------------------------------------- */
    /* CREATE PAYOUT                                                        */
    /* -------------------------------------------------------------------- */

    const payout = await PayoutModel.create({
      walletId: input.walletId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,

      amount: input.amount,
      currency: input.currency,
      fee,
      netAmount,

      status: PayoutStatus.REQUESTED,

      destination: input.destination,

      meta: {
        initiatedBy: input.initiatedBy,
        idempotencyKey: input.idempotencyKey,
        riskSnapshot: input.riskSnapshot,
        ipAddress: input.context?.ipAddress,
        userAgent: input.context?.userAgent,
        module: input.context?.module,
        entityId: input.context?.entityId,
      },

      requestedAt: new Date(),
    });

    /* -------------------------------------------------------------------- */
    /* AUDIT                                                                 */
    /* -------------------------------------------------------------------- */

    await TrackingService.system(
      {
        userId: input.ownerId,
      },
      {
        action: "PAYOUT_CREATED",
        outcome: AuditOutcome.SUCCESS,
        message: `Payout ${payout._id.toString()} created`,
        metadata: {
          amount: payout.amount,
          currency: payout.currency,
        },
      }
    );

    return payout;
  }

  /* ======================================================================== */
  /* REVIEW                                                                   */
  /* ======================================================================== */

  /**
   * Passage en revue humaine / IA.
   */
  static async reviewPayout(
    payoutId: Types.ObjectId,
    decision: "APPROVE" | "REJECT",
    reason?: string
  ): Promise<PayoutDocument> {
    const payout = await PayoutModel.findById(payoutId);

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (!payout.canTransitionTo(PayoutStatus.APPROVED)) {
      throw new Error("Invalid payout state transition");
    }

    if (decision === "REJECT") {
      payout.status = PayoutStatus.REJECTED;
      payout.rejectionReason = reason;
    } else {
      payout.status = PayoutStatus.APPROVED;
      payout.approvedAt = new Date();
    }

    await payout.save();
    return payout;
  }

  /* ======================================================================== */
  /* EXECUTE                                                                  */
  /* ======================================================================== */

  /**
   * Exécuter un payout (transactionnel).
   */
  static async executePayout(
    payoutId: Types.ObjectId
  ): Promise<ExecutePayoutResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payout = await PayoutModel.findById(
        payoutId
      ).session(session);

      if (!payout) {
        throw new Error("Payout not found");
      }

      if (!payout.canTransitionTo(PayoutStatus.PROCESSING)) {
        throw new Error("Payout cannot be executed");
      }

      /* ------------------------------------------------------------------ */
      /* LOCK WALLET                                                        */
      /* ------------------------------------------------------------------ */

      const wallet = await WalletModel.findById(
        payout.walletId
      ).session(session);

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const balance = wallet.balances.find(
        (b) => b.currency === payout.currency
      );

      if (!balance || balance.available < payout.amount) {
        throw new Error("Insufficient funds at execution time");
      }

      balance.available -= payout.amount;
      balance.updatedAt = new Date();

      await wallet.save({ session });

      /* ------------------------------------------------------------------ */
      /* CREATE LEDGER TRANSACTION                                          */
      /* ------------------------------------------------------------------ */

      const transaction = await TransactionModel.create(
        [
          {
            reference: `PAYOUT-${payout._id.toString()}`,
            direction: "OUT",
            nature: "PAYOUT",
            status: "COMPLETED",

            from: {
              walletId: payout.walletId,
              ownerType: payout.ownerType,
              ownerId: payout.ownerId,
            },

            amounts: {
              currency: payout.currency,
              amount: payout.amount,
              fee: payout.fee,
              netAmount: payout.netAmount,
            },

            referenceContext: {
              module: "pay",
              entityId: payout._id.toString(),
              action: "execute",
            },

            meta: {
              initiatedBy: payout.meta.initiatedBy,
              trustScoreAtExecution:
                payout.meta.riskSnapshot.trustScore,
            },

            completedAt: new Date(),
          },
        ],
        { session }
      );

      /* ------------------------------------------------------------------ */
      /* UPDATE PAYOUT                                                      */
      /* ------------------------------------------------------------------ */

      payout.status = PayoutStatus.COMPLETED;
      payout.relatedTransactionId =
        transaction[0]._id;
      payout.completedAt = new Date();

      await payout.save({ session });

      /* ------------------------------------------------------------------ */
      /* COMMIT                                                             */
      /* ------------------------------------------------------------------ */

      await session.commitTransaction();
      session.endSession();

      return {
        payout,
        transactionId: transaction[0]._id,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /* ======================================================================== */
  /* QUERY                                                                    */
  /* ======================================================================== */

  static async getByWallet(
    walletId: Types.ObjectId,
    limit = 50
  ): Promise<PayoutDocument[]> {
    return PayoutModel.find({ walletId })
      .sort({ requestedAt: -1 })
      .limit(limit)
      .exec();
  }

  static async getById(
    payoutId: Types.ObjectId
  ): Promise<PayoutDocument | null> {
    return PayoutModel.findById(payoutId).exec();
  }
}
