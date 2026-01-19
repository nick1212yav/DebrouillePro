/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — UNIT SETUP (WORLD #1 FINAL)                         */
/* -------------------------------------------------------------------------- */
/*  File: backend/tests/unit/setup.ts                                        */
/* -------------------------------------------------------------------------- */

import process from "process";

/* -------------------------------------------------------------------------- */
/* ENV MOCK                                                                   */
/* -------------------------------------------------------------------------- */

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ??
  "unit-test-access-secret-very-secure";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  "unit-test-refresh-secret-very-secure";
process.env.MONGO_URI =
  process.env.MONGO_URI ??
  "mongodb://localhost:27017/debrouille-test";

/* -------------------------------------------------------------------------- */
/* GLOBAL SAFETY                                                              */
/* -------------------------------------------------------------------------- */

beforeAll(() => {
  console.log("🧪 Unit tests bootstrap ready");
});

afterAll(() => {
  console.log("✅ Unit tests completed");
});
