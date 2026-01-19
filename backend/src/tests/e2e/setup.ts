/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — E2E SETUP (WORLD #1 FINAL)                          */
/* -------------------------------------------------------------------------- */
/*  File: backend/tests/e2e/setup.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Role:                                                                     */
/*   - Prepare environment for full end-to-end tests                          */
/*   - Boot real application instance                                         */
/*   - Ensure deterministic teardown                                          */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import http from "http";
import { createApp } from "@/app";

let server: http.Server | null = null;
export let BASE_URL = "http://127.0.0.1:5050";

/* -------------------------------------------------------------------------- */
/* ENV SETUP                                                                  */
/* -------------------------------------------------------------------------- */

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.PORT = "5050";
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ??
    "e2e-access-secret";
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ??
    "e2e-refresh-secret";
  process.env.MONGO_URI =
    process.env.MONGO_URI ??
    "mongodb://localhost:27017/debrouille-e2e";

  const app = createApp();

  await new Promise<void>((resolve) => {
    server = app.listen(5050, () => {
      console.log("🚀 E2E server started on 5050");
      resolve();
    });
  });
});

/* -------------------------------------------------------------------------- */
/* TEARDOWN                                                                   */
/* -------------------------------------------------------------------------- */

afterAll(async () => {
  if (!server) return;

  await new Promise<void>((resolve) =>
    server!.close(() => {
      console.log("🛑 E2E server stopped");
      resolve();
    })
  );
});
