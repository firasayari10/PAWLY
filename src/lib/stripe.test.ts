import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getStripe, __resetStripeForTests } from "./stripe";

const ORIGINAL = process.env.STRIPE_SECRET_KEY;

describe("getStripe", () => {
  beforeEach(() => {
    __resetStripeForTests();
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = ORIGINAL;
    __resetStripeForTests();
  });

  it("throws a clear error when the secret key is missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("constructs a client when the key is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const stripe = getStripe();
    expect(stripe).toBeTruthy();
    expect(typeof stripe.checkout.sessions.create).toBe("function");
  });

  it("memoises the client across calls", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    expect(getStripe()).toBe(getStripe());
  });
});
