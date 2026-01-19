/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE PAY — WALLET SERVICE (DISTRIBUTED LEDGER ENGINE — LOCKED)       */
/*  File: backend/src/core/pay/wallet/wallet.service.ts                       */
/* -------------------------------------------------------------------------- */

import mongoose, { Types, ClientSession } from "mongoose";

import {
  WalletModel,
  WalletHydratedDocument,
} from "./wallet.model";

import {
  WalletStatus,
  CurrencyCode,
  WalletBalance,
  PaymentRail,
  MobileMoneyOperator,
} from "./wallet.types";

import { EscrowModel } from "../escrow/escrow.model";

/**
 * ✅ IMPORTANT
 * On importe uniquement depuis l’API publique du module Trust.
 * Jamais depuis un fichier interne (trust.types.ts).
 */
import {
  TrustService,
  IdentityKind,
  TrustEventType,
  TrustSource,
} from "../../trust";

import { TrackingService } from "../../tracking/tracking.service";
import { AuditOutcome } from "../../tracking/auditLog.model";

/* -------------------------------------------------------------------------- */
/* ERRORS                                                                     */
/* -------------------------------------------------------------------------- */

export type WalletErrorCode =
  | "WALLET_NOT_FOUND"
  | "WALLET_FROZEN"
  | "INSUFFICIENT_FUNDS"
  | "INVALID_AMOUNT"
  | "SECURITY_BLOCK"
  | "CONCURRENT_MODIFICATION";

export class WalletError extends Error {
  public readonly code: WalletErrorCode;

  constructor(message: string, code: WalletErrorCode) {
    super(message);
    this.code = code;
  }
}

/* -------------------------------------------------------------------------- */
/* INTERNAL TYPES                                                             */
/* -------------------------------------------------------------------------- */

type LedgerMutation = Readonly<{
  currency: CurrencyCode;
  deltaAvailable?: number;
  deltaLocked?: number;
  deltaPending?: number;
}>;

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Ensures amount is strictly positive and finite.
 */
function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new WalletError(
      `Invalid amount: ${amount}`,
      "INVALID_AMOUNT"
    );
  }
}

/**
 * Creates a deterministic empty balance.
 */
function createEmptyBalance(
  currency: CurrencyCode
): WalletBalance {
  return {
    currency,
    available: 0,
    locked: 0,
    pending: 0,
    updatedAt: new Date(),
  };
}

/* -------------------------------------------------------------------------- */
/* WALLET SERVICE                                                             */
/* -------------------------------------------------------------------------- */

export class WalletService {
  /* ======================================================================== */
  /* WALLET CREATION                                                          */
  /* ======================================================================== */

  static async createWallet(params: {
    ownerType: "PERSON" | "ORGANIZATION";
    ownerId: Types.ObjectId;
    trustScore: number;
    verificationLevel: number;
    primaryCurrency?: CurrencyCode;
  }): Promise<WalletHydratedDocument> {
    const existing = await WalletModel.findOne({
      ownerType: params.ownerType,
      ownerId: params.ownerId,
    });

    if (existing) return existing;

    const wallet = new WalletModel({
      ownerType: params.ownerType,
      ownerId: params.ownerId,
      status: WalletStatus.ACTIVE,
      balances: params.primaryCurrency
        ? [createEmptyBalance(params.primaryCurrency)]
        : [],
      meta: {
        trustScoreAtCreation: params.trustScore,
        verificationLevelAtCreation:
          params.verificationLevel,
        createdFrom: "SYSTEM",
      },
    });

    await wallet.save();

    await TrackingService.system(
      {},
      {
        action: "WALLET_CREATED",
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          walletId: wallet._id.toString(),
        },
      }
    );

    return wallet;
  }

  /* ======================================================================== */
  /* WALLET ACCESS                                                            */
  /* ======================================================================== */

  static async getWalletOrFail(
    walletId: Types.ObjectId,
    session?: ClientSession
  ): Promise<WalletHydratedDocument> {
    const wallet = await WalletModel.findById(
      walletId
    ).session(session ?? null);

    if (!wallet) {
      throw new WalletError(
        "Wallet not found",
        "WALLET_NOT_FOUND"
      );
    }

    if (wallet.status === WalletStatus.FROZEN) {
      throw new WalletError(
        "Wallet is frozen",
        "WALLET_FROZEN"
      );
    }

    return wallet;
  }

  /**
   * Always returns a balance object.
   * If missing, it is NOT persisted automatically.
   */
  static getBalance(
    wallet: WalletHydratedDocument,
    currency: CurrencyCode
  ): WalletBalance {
    return (
      wallet.balances.find(
        (b) => b.currency === currency
      ) ?? createEmptyBalance(currency)
    );
  }

  /* ======================================================================== */
  /* LEDGER MUTATION ENGINE                                                   */
  /* ======================================================================== */

  private static applyLedgerMutation(
    wallet: WalletHydratedDocument,
    mutation: LedgerMutation
  ): WalletBalance {
    let balance = wallet.balances.find(
      (b) => b.currency === mutation.currency
    );

    if (!balance) {
      balance = createEmptyBalance(
        mutation.currency
      );
      wallet.balances.push(balance);
    }

    balance.available += mutation.deltaAvailable ?? 0;
    balance.locked += mutation.deltaLocked ?? 0;
    balance.pending += mutation.deltaPending ?? 0;

    if (
      balance.available < 0 ||
      balance.locked < 0 ||
      balance.pending < 0
    ) {
      throw new WalletError(
        "Negative balance detected",
        "SECURITY_BLOCK"
      );
    }

    balance.updatedAt = new Date();
    return balance;
  }

  /* ======================================================================== */
  /* TRANSACTION WRAPPER                                                      */
  /* ======================================================================== */

  private static async withTransaction<T>(
    handler: (session: ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await handler(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /* ======================================================================== */
  /* FUNDS OPERATIONS                                                         */
  /* ======================================================================== */

  static async credit(params: {
    walletId: Types.ObjectId;
    currency: CurrencyCode;
    amount: number;
    source: PaymentRail;
    operator?: MobileMoneyOperator;
    reference?: string;
  }): Promise<WalletHydratedDocument> {
    assertValidAmount(params.amount);

    return this.withTransaction(async (session) => {
      const wallet = await this.getWalletOrFail(
        params.walletId,
        session
      );

      this.applyLedgerMutation(wallet, {
        currency: params.currency,
        deltaAvailable: params.amount,
      });

      await wallet.save({ session });

      await TrustService.applyEvent({
        identityKind:
          wallet.ownerType === "PERSON"
            ? IdentityKind.PERSON
            : IdentityKind.ORGANIZATION,

        userId:
          wallet.ownerType === "PERSON"
            ? wallet.ownerId
            : undefined,

        organizationId:
          wallet.ownerType === "ORGANIZATION"
            ? wallet.ownerId
            : undefined,

        eventType: TrustEventType.TRANSACTION_SUCCESS,
        source: TrustSource.SYSTEM,

        metadata: {
          amount: params.amount,
          currency: params.currency,
          source: params.source,
          operator: params.operator,
          reference: params.reference,
        },
      });

      return wallet;
    });
  }

  static async debit(params: {
    walletId: Types.ObjectId;
    currency: CurrencyCode;
    amount: number;
  }): Promise<WalletHydratedDocument> {
    assertValidAmount(params.amount);

    return this.withTransaction(async (session) => {
      const wallet = await this.getWalletOrFail(
        params.walletId,
        session
      );

      const balance = this.getBalance(
        wallet,
        params.currency
      );

      if (balance.available < params.amount) {
        throw new WalletError(
          "Insufficient funds",
          "INSUFFICIENT_FUNDS"
        );
      }

      this.applyLedgerMutation(wallet, {
        currency: params.currency,
        deltaAvailable: -params.amount,
      });

      await wallet.save({ session });
      return wallet;
    });
  }

  /* ======================================================================== */
  /* ESCROW INTEGRATION                                                       */
  /* ======================================================================== */

  static async lockToEscrow(params: {
    walletId: Types.ObjectId;
    amount: number;
    currency: CurrencyCode;
    relatedTransactionId: Types.ObjectId;
  }) {
    assertValidAmount(params.amount);

    return this.withTransaction(async (session) => {
      const wallet = await this.getWalletOrFail(
        params.walletId,
        session
      );

      const balance = this.getBalance(
        wallet,
        params.currency
      );

      if (balance.available < params.amount) {
        throw new WalletError(
          "Insufficient funds",
          "INSUFFICIENT_FUNDS"
        );
      }

      this.applyLedgerMutation(wallet, {
        currency: params.currency,
        deltaAvailable: -params.amount,
        deltaLocked: params.amount,
      });

      await wallet.save({ session });

      const [escrow] = await EscrowModel.create(
        [
          {
            amount: params.amount,
            currency: params.currency,
            from: {
              walletId: wallet._id,
              ownerType: wallet.ownerType,
              ownerId: wallet.ownerId,
            },
            to: {
              walletId: wallet._id,
              ownerType: wallet.ownerType,
              ownerId: wallet.ownerId,
            },
            relatedTransactionId:
              params.relatedTransactionId,
            meta: {
              createdBy: "SYSTEM",
              module: "PAY",
              trustScoreAtCreation:
                wallet.meta.trustScoreAtCreation,
            },
          },
        ],
        { session }
      );

      return escrow;
    });
  }

  /* ======================================================================== */
  /* FREEZE / UNFREEZE                                                        */
  /* ======================================================================== */

  static async freezeWallet(
    walletId: Types.ObjectId,
    reason: string
  ): Promise<WalletHydratedDocument | null> {
    return WalletModel.findByIdAndUpdate(
      walletId,
      {
        $set: {
          status: WalletStatus.FROZEN,
          security: {
            frozenReason: reason,
            frozenAt: new Date(),
            frozenBy: "SYSTEM",
          },
        },
      },
      { new: true }
    );
  }

  static async unfreezeWallet(
    walletId: Types.ObjectId
  ): Promise<WalletHydratedDocument | null> {
    return WalletModel.findByIdAndUpdate(
      walletId,
      {
        $set: { status: WalletStatus.ACTIVE },
        $unset: { security: 1 },
      },
      { new: true }
    );
  }
}
