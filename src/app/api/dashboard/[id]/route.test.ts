import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendConfirmationEmail: vi.fn(), sendRefusalEmail: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { PUT } from "./route";

type TableCfg = { row?: Record<string, unknown> | null; onUpdate?: (p: Record<string, unknown>) => void };

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        update: (p: Record<string, unknown>) => { c.onUpdate?.(p); return b; },
        upsert: () => b,
        then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      };
      return b;
    },
  };
}

function req(body: unknown) {
  return new Request("http://localhost/api/dashboard/o1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const params = Promise.resolve({ id: "o1" });

const SITTER = { id_user: "sitter1", prenom: "Sam", nom: "Iter", role: "prestataire", statut_compte: "actif" };
const PENDING_OFFER = {
  id: "o1", type_animal: "chien", nom_animal: "Rex", nb_animaux: 1,
  date_debut: "2026-04-10", date_fin: "2026-04-15", tarif_total: 150, statut: "en_attente",
  proprietaire: { prenom: "Pat", nom: "Owner", email: "pat@owner.fr" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("PUT /api/dashboard/:id", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await PUT(req({ action: "accepter" }), { params })).status).toBe(401);
  });

  it("400 on an invalid action", async () => {
    const res = await PUT(req({ action: "delete" }), { params });
    expect(res.status).toBe(400);
  });

  it("403 for a non-prestataire", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { ...SITTER, role: "proprietaire" } } }) as never,
    );
    expect((await PUT(req({ action: "accepter" }), { params })).status).toBe(403);
  });

  it("404 when the offer is not addressed to this sitter (IDOR)", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: SITTER }, offre_garde: { row: null } }) as never,
    );
    expect((await PUT(req({ action: "accepter" }), { params })).status).toBe(404);
  });

  it("409 when the offer was already treated", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: SITTER },
        offre_garde: { row: { ...PENDING_OFFER, statut: "accepte" } },
      }) as never,
    );
    expect((await PUT(req({ action: "accepter" }), { params })).status).toBe(409);
  });

  it("200 and accepts a pending offer", async () => {
    const onUpdate = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: SITTER },
        offre_garde: { row: PENDING_OFFER, onUpdate },
      }) as never,
    );
    const res = await PUT(req({ action: "accepter" }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.statut).toBe("accepte");
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ statut: "accepte" }));
  });
});
