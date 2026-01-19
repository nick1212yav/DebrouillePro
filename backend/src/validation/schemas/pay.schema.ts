/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE VALIDATION — PAY SCHEMAS (WORLD #1 FINAL)                    */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/validation/schemas/pay.schema.ts                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Validate all payment-related payloads                                  */
/*   - Enforce financial invariants                                           */
/*   - Prevent fraud / malformed transactions                                 */
/*   - Normalize monetary values                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { z } from "../zod";
import { PAY } from "../../config/constants";

/* -------------------------------------------------------------------------- */
/* COMMON MONEY FIELDS                                                        */
/* -------------------------------------------------------------------------- */

const currencySchema = z
  .string()
  .length(3)
  .transform((v) => v.toUpperCase());

const amountSchema = z
  .number()
  .positive()
  .min(PAY.MIN_TRANSACTION_AMOUNT)
  .max(PAY.MAX_TRANSACTION_AMOUNT);

/**
 * Idempotency key prevents duplicate payments.
 */
const idempotencyKeySchema = z
  .string()
  .min(12)
  .max(120);

/* -------------------------------------------------------------------------- */
/* WALLET                                                                     */
/* -------------------------------------------------------------------------- */

export const walletCreateSchema = z
  .object({
    ownerId: z.string().min(8),
    currency: currencySchema.default(
      PAY.DEFAULT_CURRENCY
    ),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* TOPUP                                                                      */
/* -------------------------------------------------------------------------- */

export const walletTopupSchema = z
  .object({
    walletId: z.string().min(8),
    amount: amountSchema,
    currency: currencySchema,
    provider: z.enum([
      "flutterwave",
      "cinetpay",
      "paystack",
      "stripe",
      "sandbox",
    ]),
    idempotencyKey: idempotencyKeySchema,
    metadata: z
      .record(z.string(), z.unknown())
      .optional(),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* TRANSFER                                                                   */
/* -------------------------------------------------------------------------- */

export const walletTransferSchema = z
  .object({
    fromWalletId: z.string().min(8),
    toWalletId: z.string().min(8),
    amount: amountSchema,
    currency: currencySchema,
    reference: z.string().min(6).max(64),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* PAYOUT                                                                     */
/* -------------------------------------------------------------------------- */

export const payoutRequestSchema = z
  .object({
    walletId: z.string().min(8),
    amount: amountSchema,
    currency: currencySchema,
    destination: z.object({
      type: z.enum(["bank", "mobile_money"]),
      account: z.string().min(6).max(120),
      provider: z.string().min(2).max(50),
    }),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* ESCROW                                                                     */
/* -------------------------------------------------------------------------- */

export const escrowCreateSchema = z
  .object({
    buyerWalletId: z.string().min(8),
    sellerWalletId: z.string().min(8),
    amount: amountSchema,
    currency: currencySchema,
    releaseCondition: z.string().min(3).max(200),
    reference: z.string().min(6).max(64),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* EXPORT TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type WalletCreateInput = z.infer<
  typeof walletCreateSchema
>;

export type WalletTopupInput = z.infer<
  typeof walletTopupSchema
>;

export type WalletTransferInput = z.infer<
  typeof walletTransferSchema
>;

export type PayoutRequestInput = z.infer<
  typeof payoutRequestSchema
>;

export type EscrowCreateInput = z.infer<
  typeof escrowCreateSchema
>;
