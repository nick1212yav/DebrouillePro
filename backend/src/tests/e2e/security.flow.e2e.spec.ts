/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — SECURITY FLOW E2E TESTS (WORLD #1 FINAL)           */
/* -------------------------------------------------------------------------- */

import {
  createTokenSession,
  rotateRefreshToken,
} from "@/security";

describe("E2E / Security Flow", () => {
  it("should create and rotate a refresh token end-to-end", () => {
    const { sessionId, newRefreshToken } =
      createTokenSession("e2e-user-1");

    const rotated =
      rotateRefreshToken(
        sessionId,
        newRefreshToken
      );

    expect(rotated.sessionId).toBe(sessionId);
    expect(rotated.newRefreshToken).toBeDefined();
    expect(rotated.newRefreshToken).not.toBe(
      newRefreshToken
    );
  });

  it("should detect token reuse attack", () => {
    const { sessionId, newRefreshToken } =
      createTokenSession("e2e-user-2");

    // First rotation OK
    const rotated =
      rotateRefreshToken(
        sessionId,
        newRefreshToken
      );

    // Reuse old token should fail
    expect(() =>
      rotateRefreshToken(
        sessionId,
        newRefreshToken
      )
    ).toThrow();

    // Using the new token should also fail because session is revoked
    expect(() =>
      rotateRefreshToken(
        sessionId,
        rotated.newRefreshToken
      )
    ).toThrow();
  });
});
