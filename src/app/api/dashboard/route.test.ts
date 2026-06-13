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
        in: () => b,
        order: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: c.rows ?? [], error: null }),
      };
      return b;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/dashboard", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET()).status).toBe(401);
  });

  it("404 when the profile is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await GET()).status).toBe(404);
  });

  it("403 for a non-prestataire", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", role: "proprietaire", statut_compte: "actif" } } }) as never,
    );
    expect((await GET()).status).toBe(403);
  });

  it("403 when the prestataire account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", role: "prestataire", statut_compte: "suspendu" } } }) as never,
    );
    expect((await GET()).status).toBe(403);
  });

  it("200 and only attaches vet info for accepted bookings", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "sitter1", role: "prestataire", statut_compte: "actif" } },
        offre_garde: {
          rows: [
            { id: "o1", statut: "accepte", proprietaire: { id_user: "owner1" } },
            { id: "o2", statut: "en_attente", proprietaire: { id_user: "owner2" } },
          ],
        },
        info_veterinaire: {
          rows: [{ proprietaire_id: "owner1", nom_clinique: "VetCare", telephone: "0102" }],
        },
      }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const accepted = json.offres.find((o: { id: string }) => o.id === "o1");
    const pending = json.offres.find((o: { id: string }) => o.id === "o2");
    expect(accepted.veterinaire).toMatchObject({ nom_clinique: "VetCare" });
    // A pending booking must never leak the owner's vet contact details.
    expect(pending.veterinaire).toBeUndefined();
  });
});
