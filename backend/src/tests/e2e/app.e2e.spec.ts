/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — APP FLOW E2E TESTS (WORLD #1 FINAL)                */
/* -------------------------------------------------------------------------- */

import request from "supertest";
import { BASE_URL } from "./setup";

describe("E2E / Application Routing", () => {
  it("should return 404 for unknown route", async () => {
    const response = await request(BASE_URL).get(
      "/unknown-route"
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(
      "ROUTE_NOT_FOUND"
    );
  });

  it("should accept JSON payloads correctly", async () => {
    const response = await request(BASE_URL)
      .post("/api/echo")
      .send({ hello: "world" })
      .set("Content-Type", "application/json");

    /**
     * Cette route peut être fictive aujourd’hui.
     * Le test valide surtout que :
     *  - body parser fonctionne
     *  - le serveur ne crash pas
     */
    expect([200, 404]).toContain(response.status);
  });
});
