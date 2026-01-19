/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — PAY SERVICE (ULTRA OFFICIAL FINAL)                        */
/*  File: backend/src/core/pay/pay.service.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE CENTRAL                                                              */
/*  - Orchestration financière unique                                         */
/*  - Application stricte des règles PAY                                      */
/*  - Sécurité ACID transactionnelle                                          */
/*  - Émission d’événements                                                   */
/*  - Compatibilité Escrow / Providers / IA / Audit                           */
/*                                                                            */
/*  INTERDICTIONS ABSOLUES                                                     */
/*  - Aucun module métier ne touche un wallet directement                     */
/*  - Aucun solde n’est modifié sans transaction                              */
/*  - Aucune opération sans validation des règles                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, { ClientSession, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { WalletModel, WalletDocument } from "./wallet.model";
import {
  TransactionModel,
  TransactionDocument,
} from "./transaction.model";

import { EscrowModel } from "./escrow.model";
import { PayoutModel } from "./payout.model";

import { PayRulesEngine } from "./pay.rules";
import { PayEvents } from "./pay.events";

import {
  PayActionContext,
  PayDecisionResult,
  CurrencyCode,
} from "./pay.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type PayExecutionContext = {
  actionContext: PayActionContext;

  reason?: string;
  metadata?: Record<string, unknown>;

  /**
   * Idempotence externe (API / webhook / retry)
   */
  idempotencyKey?: string;

  /**
   * Traçabilité réseau
   */
  ipAddress?: string;
  userAgent?: string;
};

/* -------------------------------------------------------------------------- */
/* INTERNAL UTILITIES                                                         */
/* -------------------------------------------------------------------------- */

class PayInternal {
  static generateReference(prefix = "DBP"): string {
    return `${prefix}-${Date.now()}-${uuidv4()
      .slice(0, 10)
      .toUpperCase()}`;
  }

  static async startSession(): Promise<ClientSession> {
    return mongoose.startSession();
  }

  static assertPositive(amount: number): void {
    if (!amount || amount <= 0) {
      throw new Error("Amount must be strictly positive");
    }
  }

  static getBalance(
    wallet: WalletDocument,
    currency: CurrencyCode
  ) {
    const balance = wallet.balances.find(
      (b) => b.currency === currency
    );

    if (!balance) {
      throw new Error(
        `Wallet does not support currency ${currency}`
      );
    }

    return balance;
  }

  static applyRules(
    context: PayActionContext
  ): PayDecisionResult {
    const decision = PayRulesEngine.evaluate({
      ownerType: context.ownerType,
      trustScore: context.trustScore || 0,
      verificationLevel: context.verificationLevel || 0,
      action: context.action as any,
      amount: context.amount,
      currency: context.currency,
      flags: context.flags,
    });

    if (decision.decision === "DENY") {
      throw new Error(`PAY DENIED: ${decision.reason}`);
    }

    return decision;
  }
}

/* -------------------------------------------------------------------------- */
/* PAY SERVICE                                                                */
/* -------------------------------------------------------------------------- */

export class PayService {
  /* ======================================================================== */
  /* WALLET → WALLET TRANSFER                                                  */
  /* ======================================================================== */

  static async transfer(params: {
    fromWalletId: Types.ObjectId;
    toWalletId: Types.ObjectId;
    amount: number;
    currency: CurrencyCode;
    context: PayExecutionContext;
  }): Promise<TransactionDocument> {
    PayInternal.assertPositive(params.amount);

    PayInternal.applyRules({
      ...params.context.actionContext,
      action: "PAYMENT",
      amount: params.amount,
      currency: params.currency,
    });

    const session = await PayInternal.startSession();

    try {
      session.startTransaction();

      const fromWallet = await WalletModel.findById(
        params.fromWalletId
      ).session(session);

      const toWallet = await WalletModel.findById(
        params.toWalletId
      ).session(session);

      if (!fromWallet || !toWallet) {
        throw new Error("Wallet not found");
      }

      if (fromWallet.status !== "ACTIVE") {
        throw new Error("Source wallet not active");
      }

      if (toWallet.status !== "ACTIVE") {
        throw new Error("Destination wallet not active");
      }

      const fromBalance = PayInternal.getBalance(
        fromWallet,
        params.currency
      );

      const toBalance = PayInternal.getBalance(
        toWallet,
        params.currency
      );

      if (fromBalance.available < params.amount) {
        throw new Error("Insufficient available balance");
      }

      /* --------------------------------------------------------------- */
      /* MUTATE BALANCES (ATOMIC)                                        */
      /* --------------------------------------------------------------- */

      fromBalance.available -= params.amount;
      fromBalance.updatedAt = new Date();

      toBalance.available += params.amount;
      toBalance.updatedAt = new Date();

      await fromWallet.save({ session });
      await toWallet.save({ session });

      /* --------------------------------------------------------------- */
      /* CREATE TRANSACTION RECORD                                      */
      /* --------------------------------------------------------------- */

      const transaction = await TransactionModel.create(
        [
          {
            reference: PayInternal.generateReference("TX"),
            direction: "INTERNAL",
            nature: "PAYMENT",
            status: "COMPLETED",

            from: {
              walletId: fromWallet._id,
              ownerType: fromWallet.ownerType,
              ownerId: fromWallet.ownerId,
            },

            to: {
              walletId: toWallet._id,
              ownerType: toWallet.ownerType,
              ownerId: toWallet.ownerId,
            },

            amounts: {
              currency: params.currency,
              amount: params.amount,
              netAmount: params.amount,
            },

            referenceContext: {
              module:
                params.context.actionContext.module ||
                "core",
              entityId:
                params.context.actionContext.entityId,
              action: "transfer",
            },

            meta: {
              initiatedBy: "USER",
              trustScoreAtExecution:
                params.context.actionContext.trustScore,
              notes: params.context.reason,
              ipAddress: params.context.ipAddress,
              userAgent: params.context.userAgent,
            },

            completedAt: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();

      /* --------------------------------------------------------------- */
      /* EVENTS                                                          */
      /* --------------------------------------------------------------- */

      PayEvents.transactionCompleted({
        transactionId: transaction[0]._id.toString(),
        reference: transaction[0].reference,
        module:
          params.context.actionContext.module || "core",
        amount: params.amount,
        currency: params.currency,
        status: "COMPLETED",
        at: new Date(),
      });

      return transaction[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /* ======================================================================== */
  /* TOPUP (EXTERNAL → WALLET)                                                 */
  /* ======================================================================== */

  static async topup(params: {
    walletId: Types.ObjectId;
    amount: number;
    currency: CurrencyCode;
    providerRef?: string;
    context: PayExecutionContext;
  }): Promise<TransactionDocument> {
    PayInternal.assertPositive(params.amount);

    PayInternal.applyRules({
      ...params.context.actionContext,
      action: "TOPUP",
      amount: params.amount,
      currency: params.currency,
    });

    const session = await PayInternal.startSession();

    try {
      session.startTransaction();

      const wallet = await WalletModel.findById(
        params.walletId
      ).session(session);

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      if (wallet.status !== "ACTIVE") {
        throw new Error("Wallet not active");
      }

      const balance = PayInternal.getBalance(
        wallet,
        params.currency
      );

      balance.available += params.amount;
      balance.updatedAt = new Date();

      await wallet.save({ session });

      const transaction = await TransactionModel.create(
        [
          {
            reference: PayInternal.generateReference("TP"),
            direction: "IN",
            nature: "TOPUP",
            status: "COMPLETED",

            to: {
              walletId: wallet._id,
              ownerType: wallet.ownerType,
              ownerId: wallet.ownerId,
            },

            amounts: {
              currency: params.currency,
              amount: params.amount,
              netAmount: params.amount,
            },

            referenceContext: {
              module:
                params.context.actionContext.module ||
                "topup",
              action: "provider-topup",
            },

            meta: {
              initiatedBy: "SYSTEM",
              notes: params.context.reason,
            },

            completedAt: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();

      PayEvents.transactionCompleted({
        transactionId: transaction[0]._id.toString(),
        reference: transaction[0].reference,
        module: "topup",
        amount: params.amount,
        currency: params.currency,
        status: "COMPLETED",
        at: new Date(),
      });

      return transaction[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /* ======================================================================== */
  /* ESCROW LOCK                                                              */
  /* ======================================================================== */

  static async lockEscrow(params: {
    fromWalletId: Types.ObjectId;
    toWalletId: Types.ObjectId;
    amount: number;
    currency: CurrencyCode;
    module: string;
    entityId?: string;
    context: PayExecutionContext;
  }) {
    PayInternal.assertPositive(params.amount);

    PayInternal.applyRules({
      ...params.context.actionContext,
      action: "ESCROW_LOCK",
      amount: params.amount,
      currency: params.currency,
    });

    const session = await PayInternal.startSession();

    try {
      session.startTransaction();

      const fromWallet = await WalletModel.findById(
        params.fromWalletId
      ).session(session);

      const toWallet = await WalletModel.findById(
        params.toWalletId
      ).session(session);

      if (!fromWallet || !toWallet) {
        throw new Error("Wallet not found");
      }

      const balance = PayInternal.getBalance(
        fromWallet,
        params.currency
      );

      if (balance.available < params.amount) {
        throw new Error("Insufficient balance for escrow");
      }

      balance.available -= params.amount;
      balance.locked += params.amount;
      balance.updatedAt = new Date();

      await fromWallet.save({ session });

      const escrow = await EscrowModel.create(
        [
          {
            amount: params.amount,
            currency: params.currency,
            status: "LOCKED",
            from: {
              walletId: fromWallet._id,
              ownerType: fromWallet.ownerType,
              ownerId: fromWallet.ownerId,
            },
            to: {
              walletId: toWallet._id,
              ownerType: toWallet.ownerType,
              ownerId: toWallet.ownerId,
            },
            relatedTransactionId: null,
            meta: {
              createdBy: "MODULE",
              module: params.module,
              entityId: params.entityId,
              trustScoreAtCreation:
                params.context.actionContext.trustScore ||
                0,
            },
            lockedAt: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();

      PayEvents.escrowLocked({
        escrowId: escrow[0]._id.toString(),
        transactionId: "",
        module: params.module,
        entityId: params.entityId,
        amount: params.amount,
        currency: params.currency,
        status: "LOCKED",
        at: new Date(),
      });

      return escrow[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /* ======================================================================== */
  /* PAYOUT REQUEST                                                           */
  /* ======================================================================== */

  static async requestPayout(params: {
    walletId: Types.ObjectId;
    amount: number;
    currency: CurrencyCode;
    destination: any;
    context: PayExecutionContext;
  }) {
    PayInternal.assertPositive(params.amount);

    PayInternal.applyRules({
      ...params.context.actionContext,
      action: "PAYOUT_REQUEST",
      amount: params.amount,
      currency: params.currency,
    });

    const session = await PayInternal.startSession();

    try {
      session.startTransaction();

      const wallet = await WalletModel.findById(
        params.walletId
      ).session(session);

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const balance = PayInternal.getBalance(
        wallet,
        params.currency
      );

      if (balance.available < params.amount) {
        throw new Error("Insufficient funds for payout");
      }

      balance.available -= params.amount;
      balance.pending += params.amount;
      balance.updatedAt = new Date();

      await wallet.save({ session });

      const payout = await PayoutModel.create(
        [
          {
            walletId: wallet._id,
            ownerType: wallet.ownerType,
            ownerId: wallet.ownerId,
            amount: params.amount,
            currency: params.currency,
            netAmount: params.amount,
            status: "REQUESTED",
            destination: params.destination,
            meta: {
              initiatedBy: "USER",
              trustScoreAtRequest:
                params.context.actionContext.trustScore ||
                0,
              verificationLevelAtRequest:
                params.context.actionContext
                  .verificationLevel || 0,
              ipAddress: params.context.ipAddress,
            },
            requestedAt: new Date(),
          },
        ],
        { session }
      );

      await session.commitTransaction();

      PayEvents.payoutRequested({
        payoutId: payout[0]._id.toString(),
        walletId: wallet._id.toString(),
        amount: params.amount,
        currency: params.currency,
        status: "REQUESTED",
        method: params.destination.method,
        at: new Date(),
      });

      return payout[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
