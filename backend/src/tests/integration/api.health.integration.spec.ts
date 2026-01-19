/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — API HEALTH INTEGRATION TESTS (WORLD #1 FINAL)     */
/* -------------------------------------------------------------------------- */

import request from "supertest";
import { createApp } from "@/app";

describe("Integration / API Health", () => {
  const app = createApp();

  it("should return healthy status", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("RUNNING");
  });
});
