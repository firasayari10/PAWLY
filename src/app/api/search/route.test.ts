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
        ilike: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: c.rows ?? [], error: null }),
      };
      return b;
    },
  };
}

function reqWith(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/search?${sp}`);
}

const SITTERS = [
  { id_user: "a", statut_compte: "actif", ville: "Paris", prestataire_profil: { tarif_jour: 20, types_animaux: ["chien"], disponible: true } },
  { id_user: "b", statut_compte: "actif", ville: "Paris", prestataire_profil: { tarif_jour: 50, types_animaux: ["chat"], disponible: true } },
  { id_user: "c", statut_compte: "actif", ville: "Paris", prestataire_profil: { tarif_jour: 15, types_animaux: ["chien"], disponible: false } },
  { id_user: "d", statut_compte: "suspendu", ville: "Paris", prestataire_profil: { tarif_jour: 10, types_animaux: ["chien"], disponible: true } },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/search", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(reqWith())).status).toBe(401);
  });

  it("403 when the calling account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "me", statut_compte: "suspendu" } } }) as never,
    );
    expect((await GET(reqWith())).status).toBe(403);
  });

  it("excludes unavailable and suspended sitters", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "me", statut_compte: "actif" }, rows: SITTERS } }) as never,
    );
    const res = await GET(reqWith());
    expect(res.status).toBe(200);
    const json = await res.json();
    const ids = json.results.map((r: { id_user: string }) => r.id_user).sort();
    // c is unavailable, d is suspended → only a and b remain.
    expect(ids).toEqual(["a", "b"]);
  });

  it("filters by tarif_max and type_animal", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "me", statut_compte: "actif" }, rows: SITTERS } }) as never,
    );
    const res = await GET(reqWith({ tarif_max: "30", type_animal: "chien" }));
    const json = await res.json();
    // Only "a": ≤30 €/day and walks dogs (b is too expensive + cats only).
    expect(json.results.map((r: { id_user: string }) => r.id_user)).toEqual(["a"]);
    expect(json.count).toBe(1);
  });
});
