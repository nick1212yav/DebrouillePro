/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE VALIDATION — IDENTITY SCHEMAS (WORLD #1 FINAL)               */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/validation/schemas/identity.schema.ts                  */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Responsibilities:                                                        */
/*   - Validate identity creation & update                                    */
/*   - Enforce global governance rules                                        */
/*   - Normalize public-facing identity data                                  */
/*   - Protect system invariants                                              */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { z } from "../zod";
import { SECURITY, SYSTEM } from "../../config/constants";

/* -------------------------------------------------------------------------- */
/* ENUMS                                                                      */
/* -------------------------------------------------------------------------- */

export const identityTypeEnum = z.enum([
  "person",
  "organization",
  "hybrid",
]);

export const identityVisibilityEnum = z.enum([
  "public",
  "network",
  "private",
  "restricted",
]);

/* -------------------------------------------------------------------------- */
/* COMMON FIELDS                                                              */
/* -------------------------------------------------------------------------- */

const displayNameSchema = z
  .string()
  .min(2)
  .max(120)
  .transform((v) => v.trim());

const handleSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(
    /^[a-zA-Z0-9_.-]+$/,
    "Handle contains invalid characters"
  )
  .transform((v) => v.toLowerCase());

const bioSchema = z
  .string()
  .max(SECURITY.BIO_MAX_LENGTH)
  .optional();

const localeSchema = z
  .string()
  .default(SYSTEM.DEFAULT_LOCALE);

/* -------------------------------------------------------------------------- */
/* PERSON IDENTITY                                                            */
/* -------------------------------------------------------------------------- */

export const personIdentitySchema = z
  .object({
    type: z.literal("person"),
    displayName: displayNameSchema,
    handle: handleSchema.optional(),
    visibility: identityVisibilityEnum
      .optional()
      .default("public"),

    profile: z
      .object({
        firstName: z.string().min(1).max(80),
        lastName: z.string().min(1).max(80),
        dateOfBirth: z
          .string()
          .optional(), // ISO date
      })
      .strict(),

    bio: bioSchema,
    locale: localeSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* ORGANIZATION IDENTITY                                                      */
/* -------------------------------------------------------------------------- */

export const organizationIdentitySchema = z
  .object({
    type: z.literal("organization"),
    displayName: displayNameSchema,
    handle: handleSchema,
    visibility: identityVisibilityEnum
      .optional()
      .default("public"),

    organization: z
      .object({
        legalName: z.string().min(2).max(200),
        registrationNumber: z
          .string()
          .optional(),
        country: z.string().min(2).max(2), // ISO-2
      })
      .strict(),

    description: z
      .string()
      .max(SECURITY.DESCRIPTION_MAX_LENGTH)
      .optional(),

    locale: localeSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* HYBRID IDENTITY                                                            */
/* -------------------------------------------------------------------------- */

export const hybridIdentitySchema = z
  .object({
    type: z.literal("hybrid"),
    displayName: displayNameSchema,
    handle: handleSchema,
    visibility: identityVisibilityEnum
      .optional()
      .default("network"),

    person: z
      .object({
        firstName: z.string().min(1).max(80),
        lastName: z.string().min(1).max(80),
      })
      .strict(),

    organization: z
      .object({
        legalName: z.string().min(2).max(200),
        country: z.string().min(2).max(2),
      })
      .strict(),

    bio: bioSchema,
    locale: localeSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* UNION — GLOBAL IDENTITY SCHEMA                                             */
/* -------------------------------------------------------------------------- */

export const identitySchema = z.discriminatedUnion(
  "type",
  [
    personIdentitySchema,
    organizationIdentitySchema,
    hybridIdentitySchema,
  ]
);

/* -------------------------------------------------------------------------- */
/* UPDATE SCHEMA                                                              */
/* -------------------------------------------------------------------------- */

export const updateIdentitySchema = identitySchema
  .partial()
  .strict();

/* -------------------------------------------------------------------------- */
/* EXPORT TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type IdentityInput = z.infer<
  typeof identitySchema
>;

export type UpdateIdentityInput = z.infer<
  typeof updateIdentitySchema
>;
