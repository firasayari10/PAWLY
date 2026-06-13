import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  rows?: Record<string, unknown>[];
  eqCalls?: [string, unknown][];
};

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: (col: string, val: unknown) => { c.eqCalls?.push([col, val]); return b; },
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

describe("GET /api/bookings", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET()).status).toBe(401);
  });

  it("404 when the profile is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await GET()).status).toBe(404);
  });

  it("200 and scopes the query to the caller's own bookings (IDOR)", async () => {
    const eqCalls: [string, unknown][] = [];
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "owner1", statut_compte: "actif" } },
        offre_garde: { rows: [{ id: "b1" }], eqCalls },
      }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookings).toHaveLength(1);
    // The owner can only ever read rows filtered to their own id.
    expect(eqCalls).toContainEqual(["proprietaire_id", "owner1"]);
  });
});
