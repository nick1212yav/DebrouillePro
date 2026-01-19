/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — AUTH FIXTURES (WORLD #1 FINAL)                      */
/* -------------------------------------------------------------------------- */
/*  File: backend/tests/fixtures/auth.fixture.ts                             */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

export interface TestSession {
  sessionId: string;
  userId: string;
  refreshToken: string;
}

/* -------------------------------------------------------------------------- */
/* GENERATORS                                                                 */
/* -------------------------------------------------------------------------- */

export const createTestSession = (
  userId: string
): TestSession => {
  return {
    sessionId: crypto.randomUUID(),
    userId,
    refreshToken: crypto
      .randomBytes(32)
      .toString("base64url"),
  };
};
