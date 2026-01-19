/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — TOKEN ROTATION INTEGRATION TESTS (WORLD #1 FINAL)  */
/* -------------------------------------------------------------------------- */

import {
  createTokenSession,
  rotateRefreshToken,
  revokeSession,
} from "@/security";

describe("Integration / Token Rotation", () => {
  it("should rotate refresh token correctly", () => {
    const { sessionId, newRefreshToken } =
      createTokenSession("user-123");

    const rotated =
      rotateRefreshToken(
        sessionId,
        newRefreshToken
      );

    expect(rotated.newRefreshToken).toBeDefined();
  });

  it("should revoke session properly", () => {
    const { sessionId } =
      createTokenSession("user-456");

    revokeSession(sessionId);

    expect(() =>
      rotateRefreshToken(sessionId, "invalid")
    ).toThrow();
  });
});
