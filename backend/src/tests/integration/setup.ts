/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — INTEGRATION SETUP (WORLD #1 FINAL)                 */
/* -------------------------------------------------------------------------- */
/*  File: backend/tests/integration/setup.ts                                 */
/* -------------------------------------------------------------------------- */

import process from "process";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ??
    "integration-access-secret";
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ??
    "integration-refresh-secret";
  process.env.MONGO_URI =
    process.env.MONGO_URI ??
    "mongodb://localhost:27017/debrouille-integration";

  console.log("🧪 Integration test environment ready");
});

afterAll(async () => {
  console.log("✅ Integration tests completed");
});
