import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET } from "./route";

function fakeSupabase(rows: Record<string, unknown>[]) {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        order: async () => ({ data: table === "offre_garde" ? rows : [], error: null }),
        maybeSingle: async () => ({ data: { id_user: "u1" }, error: null }),
      };
      return b;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/bookings/history", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET()).status).toBe(401);
  });

  it("returns only finished bookings (cancelled, refused, or stay ended)", async () => {
    const future = "2999-01-01";
    const past = "2000-01-01";
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase([
        { id: "active", statut: "accepte", statut_paiement: "paye", date_fin: future }, // excluded
        { id: "cancelled", statut: "annule", date_fin: future }, // included (terminal)
        { id: "refused", statut: "refuse", date_fin: future }, // included (terminal)
        { id: "ended", statut: "accepte", statut_paiement: "paye", date_fin: past }, // included (past)
      ]) as never,
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const ids = json.history.map((b: { id: string }) => b.id).sort();
    expect(ids).toEqual(["cancelled", "ended", "refused"]);
  });
});
