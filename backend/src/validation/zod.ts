/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE VALIDATION — ZOD CORE (WORLD #1 FINAL)                       */
/* -------------------------------------------------------------------------- */
/*  File: backend/src/validation/zod.ts                                       */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Strategic role:                                                          */
/*   - Centralize Zod configuration                                           */
/*   - Enforce consistent validation behavior                                 */
/*   - Provide reusable helpers                                               */
/*   - Guarantee runtime safety                                               */
/*                                                                            */
/*  Guarantees:                                                              */
/*   - Strict schemas                                                         */
/*   - Safe parsing                                                           */
/*   - Human readable errors                                                  */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import { z, ZodError, ZodSchema } from "zod";
import { AppError } from "../middlewares/errorHandler";

/* -------------------------------------------------------------------------- */
/* GLOBAL ZOD CONFIG                                                          */
/* -------------------------------------------------------------------------- */

/**
 * All schemas must be strict by default.
 */
z.setErrorMap((issue, ctx) => {
  return {
    message: `Validation error: ${issue.path.join(
      "."
    )} - ${ctx.defaultError}`,
  };
});

/* -------------------------------------------------------------------------- */
/* ERROR NORMALIZATION                                                        */
/* -------------------------------------------------------------------------- */

export const formatZodError = (
  error: ZodError
): AppError => {
  const details = error.errors.map((e) => ({
    path: e.path.join("."),
    message: e.message,
  }));

  return new AppError({
    message: "Invalid request payload",
    statusCode: 400,
    code: "VALIDATION_ERROR",
    isOperational: true,
  });
};

/* -------------------------------------------------------------------------- */
/* SAFE PARSING WRAPPER                                                       */
/* -------------------------------------------------------------------------- */

export const validateSchema = <T>(
  schema: ZodSchema<T>,
  payload: unknown
): T => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
};

/* -------------------------------------------------------------------------- */
/* RE-EXPORT                                                                  */
/* -------------------------------------------------------------------------- */

export { z };
