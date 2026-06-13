import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendCancellationEmail: vi.fn().mockResolvedValue(undefined) }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { PUT } from "./route";

function fakeSupabase(cfg: {
  me?: Record<string, unknown> | null;
  offre?: Record<string, unknown> | null;
  onUpdate?: (p: Record<string, unknown>) => void;
}) {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({
          data: table === "utilisateur" ? cfg.me ?? null : cfg.offre ?? null,
          error: null,
        }),
        update: (p: Record<string, unknown>) => { cfg.onUpdate?.(p); return b; },
      };
      return b;
    },
  };
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const FUTURE = "2999-01-01";
const PAST = "2000-01-01";

function stripeMock(create = vi.fn().mockResolvedValue({ id: "re_1" })) {
  return { refunds: { create } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
  vi.mocked(getStripe).mockReturnValue(stripeMock() as never);
});

describe("PUT /api/bookings/:id/cancel", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(401);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1", statut_compte: "suspendu" } }) as never,
    );
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(403);
  });

  it("404 when the booking is not found", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ me: { id_user: "u1" }, offre: null }) as never);
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(404);
  });

  it("409 when the booking is already terminated", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { id: "o1", statut: "annule", statut_paiement: "rembourse", date_debut: FUTURE } }) as never,
    );
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(409);
  });

  it("cancels an unpaid booking without calling Stripe", async () => {
    const onUpdate = vi.fn();
    const create = vi.fn();
    vi.mocked(getStripe).mockReturnValue(stripeMock(create) as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { id: "o1", statut: "accepte", statut_paiement: "non_paye", date_debut: FUTURE }, onUpdate }) as never,
    );
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refunded).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ statut: "annule" }));
  });

  it("refunds a paid future booking via Stripe", async () => {
    const onUpdate = vi.fn();
    const create = vi.fn().mockResolvedValue({ id: "re_42" });
    vi.mocked(getStripe).mockReturnValue(stripeMock(create) as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        me: { id_user: "u1" },
        offre: { id: "o1", statut: "accepte", statut_paiement: "paye", date_debut: FUTURE, stripe_payment_intent: "pi_9", proprietaire: { prenom: "S", nom: "M", email: "o@test.fr" }, prestataire: { prenom: "J", nom: "D", email: "s@test.fr" } },
        onUpdate,
      }) as never,
    );
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refunded).toBe(true);
    expect(create).toHaveBeenCalledWith({ payment_intent: "pi_9" });
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ statut: "annule", statut_paiement: "rembourse", stripe_refund_id: "re_42" }));
  });

  it("blocks cancelling a paid booking that has already started", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { id: "o1", statut: "accepte", statut_paiement: "paye", date_debut: PAST, stripe_payment_intent: "pi_9" } }) as never,
    );
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(409);
  });

  it("422 when a paid booking has no payment intent to refund", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { id: "o1", statut: "accepte", statut_paiement: "paye", date_debut: FUTURE, stripe_payment_intent: null } }) as never,
    );
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(422);
  });

  it("502 when the Stripe refund fails", async () => {
    const create = vi.fn().mockRejectedValue(new Error("stripe down"));
    vi.mocked(getStripe).mockReturnValue(stripeMock(create) as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { id: "o1", statut: "accepte", statut_paiement: "paye", date_debut: FUTURE, stripe_payment_intent: "pi_9" } }) as never,
    );
    const res = await PUT(new Request("http://x", { method: "PUT" }), params("o1"));
    expect(res.status).toBe(502);
  });
});
