/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — ENCRYPTION UNIT TESTS (WORLD #1 FINAL)             */
/* -------------------------------------------------------------------------- */

import { encrypt, decrypt } from "@/security";

describe("Security / Encryption", () => {
  it("should encrypt and decrypt payload correctly", () => {
    const payload = "UltraSecretPayload-123";

    const encrypted = encrypt(payload);
    expect(encrypted).not.toEqual(payload);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(payload);
  });

  it("should fail on corrupted payload", () => {
    const payload = encrypt("hello");

    const corrupted =
      payload.slice(0, payload.length - 3) + "xxx";

    expect(() => decrypt(corrupted)).toThrow();
  });
});
