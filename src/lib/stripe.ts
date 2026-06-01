import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Lazily construct the Stripe client. We read the secret at call time (not at
 * module load) so `next build` and any code path that doesn't touch payments
 * never requires the key to be present.
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  cached = new Stripe(key);
  return cached;
}

/** Test seam: reset the memoised client (used by unit tests). */
export function __resetStripeForTests() {
  cached = null;
}
