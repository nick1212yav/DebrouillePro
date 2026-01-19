/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — ESCROW SERVICE (ULTRA CANONICAL FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/core/pay/escrow/escrow.service.ts                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  RÔLE                                                                      */
/*  - Créer, verrouiller, libérer et arbitrer les escrows                      */
/*  - Garantir cohérence financière absolue                                   */
/*  - Orchestration Wallet + Transaction + Audit + Trust                      */
/*  - Résilience, idempotence, traçabilité                                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import mongoose, { Types } from "mongoose";

import {
  EscrowModel,
  EscrowDocument,
  EscrowStatus,
  EscrowReleaseTrigger,
  EscrowRiskLevel,
} from "./escrow.model";

import { WalletModel } from "../wallet/wallet.model";
import { TransactionModel } from "../transaction/transaction.model";

import { TrackingService } from "../../tracking/tracking.service";
import { AuditOutcome } from "../../tracking/auditLog.model";

import { TrustService } from "../../trust/trust.service";
import { IdentityKind } from "../../identity/identity.types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CreateEscrowInput = {
  amount: number;
  currency: string;

  fromWalletId: Types.ObjectId;
  toWalletId: Types.ObjectId;

  fromOwner: {
    ownerType: "PERSON" | "ORGANIZATION";
    ownerId: Types.ObjectId;
  };

  toOwner: {
    ownerType: "PERSON" | "ORGANIZATION";
    ownerId: Types.ObjectId;
  };

  relatedTransactionId: Types.ObjectId;

  rules?: {
    autoReleaseAfterDays?: number;
    allowPartialRelease?: boolean;
    requiresConfirmation?: boolean;
    allowDispute?: boolean;
    maxHoldingDays?: number;
  };

  meta: {
    createdBy: "SYSTEM" | "MODULE" | "ADMIN";
    module: string;
    entityId?: string;
    trustScoreAtCreation: number;
    riskLevel?: EscrowRiskLevel;
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
  };
};

export type ReleaseEscrowInput = {
  escrowId: Types.ObjectId;
  trigger: EscrowReleaseTrigger;
  amount?: number;
  actor?: {
    identityKind?: IdentityKind;
    userId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
  };
  reason?: string;
};

export type DisputeEscrowInput = {
  escrowId: Types.ObjectId;
  reason?: string;
  actor?: {
    identityKind?: IdentityKind;
    userId?: Types.ObjectId;
    organizationId?: Types.ObjectId;
  };
};

/* -------------------------------------------------------------------------- */
/* ESCROW SERVICE                                                             */
/* -------------------------------------------------------------------------- */

export class EscrowService {
  /* ======================================================================== */
  /* CREATE & LOCK                                                           */
  /* ======================================================================== */

  /**
   * Créer un escrow et verrouiller les fonds.
   * Transaction Mongo atomique.
   */
  static async createEscrow(
    input: CreateEscrowInput
  ): Promise<EscrowDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const fromWallet = await WalletModel.findById(
        input.fromWalletId
      ).session(session);

      const toWallet = await WalletModel.findById(
        input.toWalletId
      ).session(session);

      if (!fromWallet || !toWallet) {
        throw new Error("Wallet not found");
      }

      if (fromWallet.balance < input.amount) {
        throw new Error("Insufficient wallet balance");
      }

      /* -------------------------------------------------------------- */
      /* LOCK FUNDS                                                     */
      /* -------------------------------------------------------------- */

      fromWallet.balance -= input.amount;
      await fromWallet.save({ session });

      /* -------------------------------------------------------------- */
      /* CREATE ESCROW                                                  */
      /* -------------------------------------------------------------- */

      const [escrow] = await EscrowModel.create(
        [
          {
            amount: input.amount,
            currency: input.currency,

            from: {
              walletId: fromWallet._id,
              ownerType: input.fromOwner.ownerType,
              ownerId: input.fromOwner.ownerId,
            },

            to: {
              walletId: toWallet._id,
              ownerType: input.toOwner.ownerType,
              ownerId: input.toOwner.ownerId,
            },

            rules: input.rules,

            relatedTransactionId:
              input.relatedTransactionId,

            meta: {
              ...input.meta,
              riskLevel:
                input.meta.riskLevel ||
                EscrowRiskLevel.MEDIUM,
            },

            status: EscrowStatus.LOCKED,
            lockedAt: new Date(),
          },
        ],
        { session }
      );

      /* -------------------------------------------------------------- */
      /* AUDIT                                                          */
      /* -------------------------------------------------------------- */

      await TrackingService.system(
        {},
        {
          action: "ESCROW_CREATED",
          outcome: AuditOutcome.SUCCESS,
          message: `Escrow ${escrow._id} locked ${input.amount} ${input.currency}`,
          metadata: {
            escrowId: escrow._id.toString(),
            transactionId:
              input.relatedTransactionId.toString(),
          },
        }
      );

      await session.commitTransaction();
      session.endSession();

      return escrow;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /* ======================================================================== */
  /* RELEASE                                                                  */
  /* ======================================================================== */

  /**
   * Libérer partiellement ou totalement un escrow.
   */
  static async releaseEscrow(
    input: ReleaseEscrowInput
  ): Promise<EscrowDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const escrow =
        await EscrowModel.findById(
          input.escrowId
        ).session(session);

      if (!escrow) {
        throw new Error("Escrow not found");
      }

      if (!escrow.canRelease(input.amount)) {
        throw new Error("Escrow cannot be released");
      }

      const toWallet = await WalletModel.findById(
        escrow.to.walletId
      ).session(session);

      if (!toWallet) {
        throw new Error("Target wallet not found");
      }

      const releaseAmount =
        input.amount ??
        escrow.amount - escrow.releasedAmount;

      /* -------------------------------------------------------------- */
      /* CREDIT TARGET WALLET                                           */
      /* -------------------------------------------------------------- */

      toWallet.balance += releaseAmount;
      await toWallet.save({ session });

      /* -------------------------------------------------------------- */
      /* UPDATE ESCROW                                                  */
      /* -------------------------------------------------------------- */

      escrow.markReleased(
        input.trigger,
        releaseAmount
      );

      await escrow.save({ session });

      /* -------------------------------------------------------------- */
      /* TRUST POSITIVE FEEDBACK                                        */
      /* -------------------------------------------------------------- */

      if (input.actor?.identityKind) {
        await TrustService.applyEvent({
          identityKind: input.actor.identityKind,
          userId: input.actor.userId,
          organizationId:
            input.actor.organizationId,
          eventType: "DELIVERY_COMPLETED",
          source: "SYSTEM",
        });
      }

      /* -------------------------------------------------------------- */
      /* AUDIT                                                          */
      /* -------------------------------------------------------------- */

      await TrackingService.system(
        {},
        {
          action: "ESCROW_RELEASED",
          outcome: AuditOutcome.SUCCESS,
          message: `Escrow ${escrow._id} released ${releaseAmount}`,
          metadata: {
            escrowId: escrow._id.toString(),
            trigger: input.trigger,
          },
        }
      );

      await session.commitTransaction();
      session.endSession();

      return escrow;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /* ======================================================================== */
  /* DISPUTE                                                                  */
  /* ======================================================================== */

  /**
   * Placer un escrow en litige.
   */
  static async disputeEscrow(
    input: DisputeEscrowInput
  ): Promise<EscrowDocument> {
    const escrow =
      await EscrowModel.findById(input.escrowId);

    if (!escrow) {
      throw new Error("Escrow not found");
    }

    escrow.markDisputed(input.reason);
    await escrow.save();

    /* -------------------------------------------------------------------- */
    /* TRUST NEGATIVE FEEDBACK                                              */
    /* -------------------------------------------------------------------- */

    if (input.actor?.identityKind) {
      await TrustService.applyEvent({
        identityKind: input.actor.identityKind,
        userId: input.actor.userId,
        organizationId:
          input.actor.organizationId,
        eventType: "DELIVERY_DISPUTED",
        source: "SYSTEM",
        severity: "HIGH",
      });
    }

    /* -------------------------------------------------------------------- */
    /* AUDIT                                                                */
    /* -------------------------------------------------------------------- */

    await TrackingService.system(
      {},
      {
        action: "ESCROW_DISPUTED",
        outcome: AuditOutcome.SUCCESS,
        message: `Escrow ${escrow._id} disputed`,
        metadata: {
          escrowId: escrow._id.toString(),
          reason: input.reason,
        },
      }
    );

    return escrow;
  }

  /* ======================================================================== */
  /* AUTO EXPIRATION                                                          */
  /* ======================================================================== */

  /**
   * Scanner et expirer automatiquement les escrows.
   * Appelé par scheduler.
   */
  static async expireEligibleEscrows(): Promise<number> {
    const now = new Date();

    const escrows = await EscrowModel.find({
      status: EscrowStatus.LOCKED,
      "rules.maxHoldingDays": { $exists: true },
    });

    let expiredCount = 0;

    for (const escrow of escrows) {
      const maxDays =
        escrow.rules?.maxHoldingDays;

      if (!maxDays) continue;

      const expiry =
        escrow.lockedAt.getTime() +
        maxDays * 24 * 60 * 60 * 1000;

      if (now.getTime() > expiry) {
        escrow.markExpired();
        await escrow.save();
        expiredCount++;
      }
    }

    return expiredCount;
  }

  /* ======================================================================== */
  /* READ HELPERS                                                             */
  /* ======================================================================== */

  static async getById(
    escrowId: Types.ObjectId
  ): Promise<EscrowDocument | null> {
    return EscrowModel.findById(escrowId);
  }

  static async getByTransaction(
    transactionId: Types.ObjectId
  ): Promise<EscrowDocument | null> {
    return EscrowModel.findOne({
      relatedTransactionId: transactionId,
    });
  }
}
