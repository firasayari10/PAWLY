import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentNoticeToSitter: vi.fn().mockResolvedValue(undefined),
}));

import { createServerSupabase } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { sendPaymentReceiptEmail, sendPaymentNoticeToSitter } from "@/lib/email";
import { POST } from "./route";

const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function fakeSupabase(offre: Record<string, unknown> | null, onUpdate?: (p: Record<string, unknown>) => void) {
  const b = {
    select: () => b,
    eq: () => b,
    maybeSingle: async () => ({ data: offre, error: null }),
    update: (payload: Record<string, unknown>) => {
      onUpdate?.(payload);
      return { eq: async () => ({ error: null }) };
    },
  };
  return { from: () => b };
}

function req(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/payments/webhook", { method: "POST", body, headers });
}

const COMPLETED_EVENT = {
  type: "checkout.session.completed",
  data: {
    object: {
      metadata: { offre_id: "offre-1" },
      client_reference_id: "offre-1",
      payment_intent: "pi_123",
    },
  },
};

const OFFRE = {
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

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

describe("POST /api/payments/webhook", () => {
  it("500 when the webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(req("{}", { "stripe-signature": "sig" }));
    expect(res.status).toBe(500);
  });

  it("400 when the signature header is missing", async () => {
    const res = await POST(req("{}"));
    expect(res.status).toBe(400);
  });

  it("400 when signature verification fails", async () => {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: () => { throw new Error("bad sig"); } },
    } as never);
    const res = await POST(req("{}", { "stripe-signature": "bad" }));
    expect(res.status).toBe(400);
  });

  it("200 and fulfils the booking on checkout.session.completed", async () => {
    const onUpdate = vi.fn();
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: () => COMPLETED_EVENT },
    } as never);
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ ...OFFRE }, onUpdate) as never);

    const res = await POST(req(JSON.stringify(COMPLETED_EVENT), { "stripe-signature": "good" }));
    expect(res.status).toBe(200);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ statut_paiement: "paye" }));
    expect(sendPaymentReceiptEmail).toHaveBeenCalledTimes(1);
    expect(sendPaymentNoticeToSitter).toHaveBeenCalledTimes(1);
  });

  it("200 and does not re-email an already-paid booking (idempotent)", async () => {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: () => COMPLETED_EVENT },
    } as never);
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ ...OFFRE, statut_paiement: "paye" }) as never,
    );

    const res = await POST(req(JSON.stringify(COMPLETED_EVENT), { "stripe-signature": "good" }));
    expect(res.status).toBe(200);
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });

  it("200 and ignores unrelated event types", async () => {
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: () => ({ type: "payment_intent.created", data: { object: {} } }) },
    } as never);
    const res = await POST(req("{}", { "stripe-signature": "good" }));
    expect(res.status).toBe(200);
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });
});
