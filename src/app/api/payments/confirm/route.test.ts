import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentNoticeToSitter: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { sendPaymentReceiptEmail } from "@/lib/email";
import { POST } from "./route";

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
        update: (p: Record<string, unknown>) => { cfg.onUpdate?.(p); return { eq: async () => ({ error: null }) }; },
      };
      return b;
    },
  };
}

function req(body: unknown, raw = false) {
  return new Request("http://localhost/api/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

function stripeMock(payment_status: string) {
  return {
    checkout: { sessions: { retrieve: vi.fn().mockResolvedValue({
      payment_status,
      metadata: { offre_id: "o1" },
      client_reference_id: "o1",
      payment_intent: "pi_1",
    }) } },
  };
}

const FULL_OFFRE = {
  id: "o1", statut_paiement: "non_paye", stripe_session_id: "cs_1",
  nom_animal: "Rex", type_animal: "chien", nb_animaux: 1,
  date_debut: "2026-04-10", date_fin: "2026-04-15", tarif_total: 150,
  proprietaire: { prenom: "S", nom: "M", email: "o@test.fr" },
  prestataire: { prenom: "J", nom: "D", email: "s@test.fr" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/payments/confirm", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(req({ offre_id: "o1" }))).status).toBe(401);
  });

  it("400 when offre_id missing", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it("404 when the booking is not found", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ me: { id_user: "u1" }, offre: null }) as never);
    expect((await POST(req({ offre_id: "o1" }))).status).toBe(404);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1", statut_compte: "suspendu" } }) as never,
    );
    expect((await POST(req({ offre_id: "o1" }))).status).toBe(403);
  });

  it("409 when there is no stored session", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { id: "o1", statut_paiement: "non_paye", stripe_session_id: null } }) as never,
    );
    expect((await POST(req({ offre_id: "o1" }))).status).toBe(409);
  });

  it("returns already_paid without calling Stripe", async () => {
    const retrieve = vi.fn();
    vi.mocked(getStripe).mockReturnValue({ checkout: { sessions: { retrieve } } } as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { id: "o1", statut_paiement: "paye", stripe_session_id: "cs_1" } }) as never,
    );
    const res = await POST(req({ offre_id: "o1" }));
    expect((await res.json()).status).toBe("already_paid");
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("returns pending when Stripe says the session is not paid", async () => {
    vi.mocked(getStripe).mockReturnValue(stripeMock("unpaid") as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { ...FULL_OFFRE } }) as never,
    );
    const res = await POST(req({ offre_id: "o1" }));
    expect((await res.json()).status).toBe("pending");
  });

  it("fulfils the booking and emails when Stripe says paid", async () => {
    const onUpdate = vi.fn();
    vi.mocked(getStripe).mockReturnValue(stripeMock("paid") as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ me: { id_user: "u1" }, offre: { ...FULL_OFFRE }, onUpdate }) as never,
    );
    const res = await POST(req({ offre_id: "o1" }));
    expect((await res.json()).status).toBe("paid");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ statut_paiement: "paye" }));
    expect(sendPaymentReceiptEmail).toHaveBeenCalledTimes(1);
  });
});
