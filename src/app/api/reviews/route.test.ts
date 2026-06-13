import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { POST } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  insertRow?: Record<string, unknown> | null;
  insertError?: { code?: string; message?: string } | null;
  onInsert?: (p: Record<string, unknown>) => void;
  onUpdate?: (p: Record<string, unknown>) => void;
};

function fakeSupabase(cfg: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = cfg[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        single: async () => ({ data: c.insertRow ?? null, error: c.insertError ?? null }),
        insert: (p: Record<string, unknown>) => { c.onInsert?.(p); return b; },
        update: (p: Record<string, unknown>) => { c.onUpdate?.(p); return b; },
      };
      return b;
    },
  };
}

function req(body: unknown, raw = false) {
  return new Request("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const PAID_OFFRE = { id: "o1", prestataire_id: "sitter1", statut: "accepte", statut_paiement: "paye" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/reviews", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(req({ offre_id: "o1", note: 5 }))).status).toBe(401);
  });

  it("400 on an invalid note", async () => {
    const res = await POST(req({ offre_id: "o1", note: 9 }));
    expect(res.status).toBe(400);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "suspendu" } } }) as never,
    );
    expect((await POST(req({ offre_id: "o1", note: 5 }))).status).toBe(403);
  });

  it("404 when the profile is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await POST(req({ offre_id: "o1", note: 5 }))).status).toBe(404);
  });

  it("404 when the booking is not found or not owned", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1" } }, offre_garde: { row: null } }) as never,
    );
    expect((await POST(req({ offre_id: "o1", note: 5 }))).status).toBe(404);
  });

  it("409 when the booking is not paid", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        offre_garde: { row: { ...PAID_OFFRE, statut_paiement: "non_paye" } },
        avis_offre: { row: null },
      }) as never,
    );
    expect((await POST(req({ offre_id: "o1", note: 5 }))).status).toBe(409);
  });

  it("409 when already reviewed", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        offre_garde: { row: { ...PAID_OFFRE } },
        avis_offre: { row: { id: "existing" } },
      }) as never,
    );
    expect((await POST(req({ offre_id: "o1", note: 5 }))).status).toBe(409);
  });

  it("201 and updates the prestataire average", async () => {
    const onInsert = vi.fn();
    const onUpdate = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        offre_garde: { row: { ...PAID_OFFRE } },
        avis_offre: { row: null, insertRow: { id: "a1", note: 5 }, onInsert },
        prestataire_profil: { row: { note_moyenne: 4, nb_avis: 1 }, onUpdate },
      }) as never,
    );

    const res = await POST(req({ offre_id: "o1", note: 5, commentaire: "Top" }));
    expect(res.status).toBe(201);
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ offre_id: "o1", prestataire_id: "sitter1", note: 5, commentaire: "Top" }),
    );
    // (4*1 + 5) / 2 = 4.5
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ note_moyenne: 4.5, nb_avis: 2 }));
  });
});
