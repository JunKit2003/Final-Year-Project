import { describe, expect, it } from "vitest";
import { PAYMENT_LABEL, STATUS_TONE, paymentLabel, refundError } from "./orderUi";

describe("order ui helpers", () => {
  it("explains refund limits", () => {
    expect(refundError(100, 78)).toBe("Can't refund more than RM 78.00");
    expect(refundError(0, 78)).toBe("Enter an amount above RM 0.00");
    expect(refundError("", 78)).toBe("Enter an amount above RM 0.00");
    expect(refundError(50, 78)).toBeNull();
  });
  it("labels payment states", () => {
    expect(paymentLabel("partly_refunded")).toBe("Partly refunded");
    expect(Object.keys(PAYMENT_LABEL)).toEqual(["unpaid", "paid", "partly_refunded", "refunded"]);
    expect(STATUS_TONE.Shipped).toBe("shipped");
  });
});
