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

const REQ = new Request("http://localhost/api/admin/signalements");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/admin/signalements", () => {
  it("403 for a non-admin", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", role: "prestataire" } } }) as never,
    );
    expect((await GET(REQ)).status).toBe(403);
  });

  it("200 with the report list for an admin", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "admin1", role: "admin" } },
        signalement: { rows: [{ id: "s1", statut: "ouvert" }, { id: "s2", statut: "resolu" }] },
      }) as never,
    );
    const res = await GET(REQ);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signalements).toHaveLength(2);
  });
});
