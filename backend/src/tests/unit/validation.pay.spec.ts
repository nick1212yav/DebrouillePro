/* -------------------------------------------------------------------------- */
/*  DÉBROUILLE TESTS — PAY VALIDATION TESTS (WORLD #1 FINAL)             */
/* -------------------------------------------------------------------------- */

import {
  walletTopupSchema,
} from "@/validation";

describe("Validation / Pay Schemas", () => {
  it("should validate a correct topup payload", () => {
    const payload = {
      walletId: "wallet-123456",
      amount: 100,
      currency: "usd",
      provider: "sandbox",
      idempotencyKey: "unique-key-123456789",
    };

    const parsed =
      walletTopupSchema.parse(payload);

    expect(parsed.currency).toBe("USD");
    expect(parsed.amount).toBe(100);
  });

  it("should reject invalid amount", () => {
    const payload = {
      walletId: "wallet-123456",
      amount: -10,
      currency: "usd",
      provider: "sandbox",
      idempotencyKey: "unique-key-123456789",
    };

    expect(() =>
      walletTopupSchema.parse(payload)
    ).toThrow();
  });
});
