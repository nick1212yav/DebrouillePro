/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE VALIDATION — AUTH SCHEMAS (WORLD #1 FINAL)                   */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/validation/schemas/auth.schema.ts                      */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Validate authentication payloads                                       */
/*   - Enforce security policies                                              */
/*   - Normalize credentials                                                  */
/*   - Prevent malformed attacks                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { z } from "../zod";
import { SECURITY } from "../../config/constants";

/* -------------------------------------------------------------------------- */
/* COMMON FIELDS                                                              */
/* -------------------------------------------------------------------------- */

const emailSchema = z
  .string()
  .email()
  .transform((v) => v.toLowerCase());

const passwordSchema = z
  .string()
  .min(SECURITY.PASSWORD_MIN_LENGTH)
  .max(SECURITY.PASSWORD_MAX_LENGTH)
  .regex(/[A-Z]/, "Password must contain uppercase")
  .regex(/[a-z]/, "Password must contain lowercase")
  .regex(/[0-9]/, "Password must contain digit");

/* -------------------------------------------------------------------------- */
/* LOGIN                                                                      */
/* -------------------------------------------------------------------------- */

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* REGISTER                                                                   */
/* -------------------------------------------------------------------------- */

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true),
  })
  .strict()
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

/* -------------------------------------------------------------------------- */
/* REFRESH TOKEN                                                              */
/* -------------------------------------------------------------------------- */

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(20),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* EXPORT TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type LoginInput = z.infer<
  typeof loginSchema
>;
export type RegisterInput = z.infer<
  typeof registerSchema
>;
export type RefreshTokenInput = z.infer<
  typeof refreshTokenSchema
>;
