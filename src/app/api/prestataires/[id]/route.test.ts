import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET } from "./route";

type TableCfg = { row?: Record<string, unknown> | null; rows?: Record<string, unknown>[] };

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        order: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: c.rows ?? [], error: null }),
      };
      return b;
    },
  };
}

const params = Promise.resolve({ id: "p1" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/prestataires/:id", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(new Request("http://localhost/api/prestataires/p1"), { params })).status).toBe(401);
  });

  it("404 when the id is not a prestataire", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await GET(new Request("http://localhost/api/prestataires/p1"), { params })).status).toBe(404);
  });

  it("200 with the prestataire profile and its reviews", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: {
          row: {
            id_user: "p1", prenom: "Sam", nom: "Iter", ville: "Paris",
            adresse: "1 rue du Test", code_postal: "75001",
            prestataire_profil: [{ id: "pp1", tarif_jour: 30, note_moyenne: 4.5 }],
          },
        },
        avis_offre: { rows: [{ id: "a1", note: 5, commentaire: "Top", auteur: { prenom: "Pat", nom: "Owner" } }] },
      }) as never,
    );
    const res = await GET(new Request("http://localhost/api/prestataires/p1"), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.prestataire.profil).toMatchObject({ id: "pp1", tarif_jour: 30 });
    expect(json.avis).toHaveLength(1);
    // Documents current behaviour: the sitter's street address is exposed to any
    // authenticated viewer (see claudedocs/security-findings.md, finding I-3).
    expect(json.prestataire.adresse).toBe("1 rue du Test");
  });
});
