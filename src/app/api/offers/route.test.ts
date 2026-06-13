import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { POST } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  single?: Record<string, unknown> | null;
  onInsert?: (p: Record<string, unknown>) => void;
};

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        single: async () => ({ data: c.single ?? null, error: null }),
        insert: (p: Record<string, unknown>) => { c.onInsert?.(p); return b; },
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
      return b;
    },
  };
}

function post(body: unknown) {
  return new Request("http://localhost/api/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID = {
  prestataire_id: "p1", type_animal: "chien", nom_animal: "Rex",
  date_debut: "2026-04-10", date_fin: "2026-04-15",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/offers", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(post(VALID))).status).toBe(401);
  });

  it("400 on missing required fields", async () => {
    expect((await POST(post({ ...VALID, nom_animal: "" }))).status).toBe(400);
  });

  it("400 on a non-positive or fractional nb_animaux", async () => {
    expect((await POST(post({ ...VALID, nb_animaux: 0 }))).status).toBe(400);
    expect((await POST(post({ ...VALID, nb_animaux: 2.5 }))).status).toBe(400);
    expect((await POST(post({ ...VALID, nb_animaux: -3 }))).status).toBe(400);
  });

  it("404 when the owner profile is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await POST(post(VALID))).status).toBe(404);
  });

  it("404 when the prestataire does not exist", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "owner1", statut_compte: "actif" } },
        prestataire_profil: { row: null },
      }) as never,
    );
    expect((await POST(post(VALID))).status).toBe(404);
  });

  it("201 and computes tarif_total server-side, ignoring any client-supplied price", async () => {
    const onInsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "owner1", statut_compte: "actif" } },
        prestataire_profil: { row: { tarif_jour: 30 } },
        offre_garde: { single: { id: "off1" }, onInsert },
      }) as never,
    );
    // Attacker tries to set their own price; the server must ignore it.
    const res = await POST(post({ ...VALID, tarif_total: 1 }));
    expect(res.status).toBe(201);
    // 30 €/day * 5 days = 150 € — derived from the DB, not the request body.
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ proprietaire_id: "owner1", prestataire_id: "p1", tarif_total: 150 }),
    );
    const inserted = onInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.tarif_total).not.toBe(1);
  });
});
