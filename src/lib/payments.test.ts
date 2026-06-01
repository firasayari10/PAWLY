import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { applyCheckoutCompleted } from "./payments";

// ── Minimal fake Supabase query builder ─────────────────────────────────────────
// Reproduces the chains used by applyCheckoutCompleted:
//   from(t).select(...).eq(...).maybeSingle()
//   from(t).update(...).eq(...)
function makeFakeSupabase(opts: {
  offre: Record<string, unknown> | null;
  onUpdate?: (payload: Record<string, unknown>) => void;
}) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    maybeSingle: async () => ({ data: opts.offre, error: null }),
    update: (payload: Record<string, unknown>) => {
      opts.onUpdate?.(payload);
      return { eq: async () => ({ data: null, error: null }) };
    },
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

const session = (over: Partial<Stripe.Checkout.Session> = {}) =>
  ({
    metadata: { offre_id: "offre-1" },
    client_reference_id: "offre-1",
    payment_intent: "pi_123",
    ...over,
  }) as unknown as Stripe.Checkout.Session;

const PAYABLE_OFFRE = {
  id: "offre-1",
  nom_animal: "Rex",
  type_animal: "chien",
  nb_animaux: 1,
  date_debut: "2026-04-10",
  date_fin: "2026-04-15",
  tarif_total: 150,
  statut_paiement: "non_paye",
  proprietaire: { prenom: "Sophie", nom: "M.", email: "owner@test.fr" },
  prestataire: { prenom: "Julie", nom: "D.", email: "sitter@test.fr" },
};

describe("applyCheckoutCompleted", () => {
  it("returns no_offre_id when neither metadata nor client_reference_id is present", async () => {
    const onUpdate = vi.fn();
    const supabase = makeFakeSupabase({ offre: null, onUpdate });
    const res = await applyCheckoutCompleted(
      supabase,
      session({ metadata: {}, client_reference_id: null }),
    );
    expect(res.status).toBe("no_offre_id");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("returns not_found when the booking does not exist", async () => {
    const onUpdate = vi.fn();
    const supabase = makeFakeSupabase({ offre: null, onUpdate });
    const res = await applyCheckoutCompleted(supabase, session());
    expect(res.status).toBe("not_found");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("marks an unpaid booking as paid and writes the expected fields", async () => {
    const onUpdate = vi.fn();
    const supabase = makeFakeSupabase({ offre: { ...PAYABLE_OFFRE }, onUpdate });
    const res = await applyCheckoutCompleted(supabase, session());

    expect(res.status).toBe("paid");
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const payload = onUpdate.mock.calls[0][0];
    expect(payload.statut_paiement).toBe("paye");
    expect(payload.stripe_payment_intent).toBe("pi_123");
    expect(typeof payload.paid_at).toBe("string");
    expect(Number.isNaN(Date.parse(payload.paid_at as string))).toBe(false);

    if (res.status === "paid") {
      expect(res.offre.proprietaire?.email).toBe("owner@test.fr");
      expect(res.offre.prestataire?.email).toBe("sitter@test.fr");
    }
  });

  it("is idempotent: an already-paid booking is not written again", async () => {
    const onUpdate = vi.fn();
    const supabase = makeFakeSupabase({
      offre: { ...PAYABLE_OFFRE, statut_paiement: "paye" },
      onUpdate,
    });
    const res = await applyCheckoutCompleted(supabase, session());
    expect(res.status).toBe("already_paid");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("resolves the offre id from client_reference_id when metadata is absent", async () => {
    const onUpdate = vi.fn();
    const supabase = makeFakeSupabase({ offre: { ...PAYABLE_OFFRE }, onUpdate });
    const res = await applyCheckoutCompleted(
      supabase,
      session({ metadata: {}, client_reference_id: "offre-1" }),
    );
    expect(res.status).toBe("paid");
  });

  it("extracts the payment intent id when Stripe expands it to an object", async () => {
    const onUpdate = vi.fn();
    const supabase = makeFakeSupabase({ offre: { ...PAYABLE_OFFRE }, onUpdate });
    await applyCheckoutCompleted(
      supabase,
      session({ payment_intent: { id: "pi_expanded" } as Stripe.PaymentIntent }),
    );
    expect(onUpdate.mock.calls[0][0].stripe_payment_intent).toBe("pi_expanded");
  });

  it("normalises an array-shaped related record to a single object", async () => {
    const onUpdate = vi.fn();
    const supabase = makeFakeSupabase({
      offre: { ...PAYABLE_OFFRE, proprietaire: [{ prenom: "Sophie", nom: "M.", email: "owner@test.fr" }] },
      onUpdate,
    });
    const res = await applyCheckoutCompleted(supabase, session());
    if (res.status === "paid") {
      expect(res.offre.proprietaire?.email).toBe("owner@test.fr");
    } else {
      throw new Error("expected paid");
    }
  });
});
