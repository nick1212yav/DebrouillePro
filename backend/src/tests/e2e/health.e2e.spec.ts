/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — HEALTH E2E TESTS (WORLD #1 FINAL)                  */
/* -------------------------------------------------------------------------- */

import request from "supertest";
import { BASE_URL } from "./setup";

describe("E2E / Health", () => {
  it("should return healthy application status", async () => {
    const response = await request(BASE_URL).get("/");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("RUNNING");
    expect(response.body.name).toContain("Debrouille");
    expect(response.body.timestamp).toBeDefined();
  });
});
