/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — HASHING UNIT TESTS (WORLD #1 FINAL)                 */
/* -------------------------------------------------------------------------- */

import { hashPassword, verifyPassword } from "@/security";

describe("Security / Hashing", () => {
  it("should hash and verify a password successfully", () => {
    const password = "SuperStrongPassword!123";

    const hash = hashPassword(password);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");

    const valid = verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("should reject invalid password", () => {
    const password = "CorrectPassword";
    const hash = hashPassword(password);

    const valid = verifyPassword(
      "WrongPassword",
      hash
    );
    expect(valid).toBe(false);
  });

  it("should generate unique hashes for same password", () => {
    const password = "SamePassword";

    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    expect(hash1).not.toEqual(hash2);
  });
});
