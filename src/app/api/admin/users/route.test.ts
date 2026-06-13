import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET } from "./route";

type TableCfg = { row?: Record<string, unknown> | null; rows?: Record<string, unknown>[] };

function makeBuilder(cfg: TableCfg) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    order: () => b,
    maybeSingle: async () => ({ data: cfg.row ?? null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: cfg.rows ?? [], error: null }),
  };
  return b;
}

function fakeSupabase(tables: Record<string, TableCfg>) {
  return { from: (t: string) => makeBuilder(tables[t] ?? {}) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/admin/users", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET()).status).toBe(401);
  });

  it("403 for a non-admin", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", role: "proprietaire" } } }) as never,
    );
    expect((await GET()).status).toBe(403);
  });

  it("403 when the admin account itself is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "admin1", role: "admin", statut_compte: "suspendu" } } }) as never,
    );
    expect((await GET()).status).toBe(403);
  });

  it("200 with users and stats for an admin", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: {
          row: { id_user: "admin1", role: "admin" },
          rows: [
            { id_user: "u1", role: "proprietaire", statut_compte: "actif" },
            { id_user: "u2", role: "prestataire", statut_compte: "actif" },
            { id_user: "u3", role: "prestataire", statut_compte: "suspendu" },
          ],
        },
      }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(3);
    expect(json.stats).toMatchObject({ total: 3, proprietaires: 1, prestataires: 2, suspendus: 1 });
  });
});
