/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — USER FIXTURES (WORLD #1 FINAL)                      */
/* -------------------------------------------------------------------------- */
/*  File: backend/tests/fixtures/user.fixture.ts                             */
/* -------------------------------------------------------------------------- */

import crypto from "crypto";

export interface TestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  trustScore: number;
}

/* -------------------------------------------------------------------------- */
/* GENERATORS                                                                 */
/* -------------------------------------------------------------------------- */

export const createTestUser = (
  overrides?: Partial<TestUser>
): TestUser => {
  const user: TestUser = {
    id: crypto.randomUUID(),
    email: `user_${Date.now()}@debrouille.test`,
    password: "StrongPassword!123",
    displayName: "Test User",
    trustScore: 50,
    ...overrides,
  };

  return user;
};
