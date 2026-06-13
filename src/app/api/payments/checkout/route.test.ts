import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { POST } from "./route";

type Row = Record<string, unknown> | null;

function fakeSupabase(tables: Record<string, { row: Row; onUpdate?: (p: Record<string, unknown>) => void }>) {
  return {
    from(table: string) {
      const cfg = tables[table];
      const b = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: cfg?.row ?? null, error: null }),
        update: (payload: Record<string, unknown>) => {
          cfg?.onUpdate?.(payload);
          return { eq: async () => ({ error: null }) };
        },
      };
      return b;
    },
  };
}

function req(body: unknown, raw = false) {
  return new Request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const ACCEPTED_OFFRE = {
  id: "offre-1",
  proprietaire_id: "u1",
  nom_animal: "Rex",
  type_animal: "chien",
  statut: "accepte",
  statut_paiement: "non_paye",
  tarif_total: 150,
};

const stripeMock = () => ({
  checkout: { sessions: { create: vi.fn().mockResolvedValue({ id: "cs_1", url: "https://stripe.test/cs_1" }) } },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
  vi.mocked(getStripe).mockReturnValue(stripeMock() as never);
});

describe("POST /api/payments/checkout", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const res = await POST(req({ offre_id: "offre-1" }));
    expect(res.status).toBe(401);
  });

  it("400 on invalid JSON", async () => {
    const res = await POST(req("not json", true));
    expect(res.status).toBe(400);
  });

  it("400 when offre_id is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({}) as never);
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", email: "o@test.fr", statut_compte: "suspendu" } } }) as never,
    );
    const res = await POST(req({ offre_id: "offre-1" }));
    expect(res.status).toBe(403);
  });

  it("404 when the user profile is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: null } }) as never,
    );
    const res = await POST(req({ offre_id: "offre-1" }));
    expect(res.status).toBe(404);
  });

  it("404 when the booking is not found or not owned", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1", email: "o@test.fr" } },
        offre_garde: { row: null },
      }) as never,
    );
    const res = await POST(req({ offre_id: "offre-1" }));
    expect(res.status).toBe(404);
  });

  it("409 when the booking is not yet accepted", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1", email: "o@test.fr" } },
        offre_garde: { row: { ...ACCEPTED_OFFRE, statut: "en_attente" } },
      }) as never,
    );
    const res = await POST(req({ offre_id: "offre-1" }));
    expect(res.status).toBe(409);
  });

  it("409 when the booking is already paid", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1", email: "o@test.fr" } },
        offre_garde: { row: { ...ACCEPTED_OFFRE, statut_paiement: "paye" } },
      }) as never,
    );
    const res = await POST(req({ offre_id: "offre-1" }));
    expect(res.status).toBe(409);
  });

  it("422 when the amount is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1", email: "o@test.fr" } },
        offre_garde: { row: { ...ACCEPTED_OFFRE, tarif_total: null } },
      }) as never,
    );
    const res = await POST(req({ offre_id: "offre-1" }));
    expect(res.status).toBe(422);
  });

  it("200 and returns a Checkout URL, recomputing the amount server-side", async () => {
    const onUpdate = vi.fn();
    const stripe = stripeMock();
    vi.mocked(getStripe).mockReturnValue(stripe as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1", email: "o@test.fr" } },
        offre_garde: { row: { ...ACCEPTED_OFFRE }, onUpdate },
      }) as never,
    );

    const res = await POST(req({ offre_id: "offre-1", tarif_total: 999999 /* must be ignored */ }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://stripe.test/cs_1");

    // Amount comes from the stored tarif_total (150€ -> 15000 cents), never the client.
    const createArg = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(createArg.line_items[0].price_data.unit_amount).toBe(15000);
    expect(createArg.metadata.offre_id).toBe("offre-1");

    // Session id is persisted for reconciliation.
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ stripe_session_id: "cs_1" }));
  });
});
