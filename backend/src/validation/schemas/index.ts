/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE VALIDATION — SCHEMAS PUBLIC HUB (WORLD #1 FINAL)             */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/validation/schemas/index.ts                            */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Single public entrypoint for all validation schemas                    */
/*   - Enforce architectural boundaries                                       */
/*   - Provide stable contracts                                               */
/*   - Prevent deep imports                                                   */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Explicit exports only                                                  */
/*   - No circular dependencies                                               */
/*   - Type-safe                                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* AUTH SCHEMAS                                                               */
/* -------------------------------------------------------------------------- */

export {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from "./auth.schema";

export type {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
} from "./auth.schema";

/* -------------------------------------------------------------------------- */
/* IDENTITY SCHEMAS                                                           */
/* -------------------------------------------------------------------------- */

export {
  identitySchema,
  updateIdentitySchema,
  personIdentitySchema,
  organizationIdentitySchema,
  hybridIdentitySchema,
  identityTypeEnum,
  identityVisibilityEnum,
} from "./identity.schema";

export type {
  IdentityInput,
  UpdateIdentityInput,
} from "./identity.schema";

/* -------------------------------------------------------------------------- */
/* PAY SCHEMAS                                                                */
/* -------------------------------------------------------------------------- */

export {
  walletCreateSchema,
  walletTopupSchema,
  walletTransferSchema,
  payoutRequestSchema,
  escrowCreateSchema,
} from "./pay.schema";

export type {
  WalletCreateInput,
  WalletTopupInput,
  WalletTransferInput,
  PayoutRequestInput,
  EscrowCreateInput,
} from "./pay.schema";

/* -------------------------------------------------------------------------- */
/* GOVERNANCE                                                                 */
/* -------------------------------------------------------------------------- */
/*
  Usage rules:

  ✅ Always import schemas from:
        import { loginSchema } from "@/validation/schemas";

  ❌ Never deep import:
        "@/validation/schemas/auth.schema"
        "@/validation/schemas/*"

  This guarantees:
   - Stable public contracts
   - Safe refactors
   - Predictable typing
*/
