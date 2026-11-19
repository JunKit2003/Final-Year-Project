import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("stripe", () => ({ default: vi.fn(function () { return { checkout: {} }; }) }));

describe("getStripe", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("refuses to create a client without a key (the API still boots)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { getStripe, PaymentsNotConfiguredError } = await import("../../config/stripe.js");
    expect(() => getStripe()).toThrow(PaymentsNotConfiguredError);
  });

  it("creates one client pinned to the API version and reuses it", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const Stripe = (await import("stripe")).default;
    const { getStripe, STRIPE_API_VERSION } = await import("../../config/stripe.js");
    const a = getStripe();
    const b = getStripe();
    expect(a).toBe(b);
    expect(Stripe).toHaveBeenCalledWith("sk_test_123", { apiVersion: STRIPE_API_VERSION });
  });
});
