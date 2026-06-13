import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET, POST } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null; // maybeSingle()
  single?: Record<string, unknown> | null; // insert().select().single()
  rows?: Record<string, unknown>[]; // awaited list query
  onInsert?: (p: Record<string, unknown>) => void;
};

function makeBuilder(cfg: TableCfg) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    in: () => b,
    order: () => b,
    insert: (p: Record<string, unknown>) => { cfg.onInsert?.(p); return b; },
    maybeSingle: async () => ({ data: cfg.row ?? null, error: null }),
    single: async () => ({ data: cfg.single ?? null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: cfg.rows ?? [], error: null }),
  };
  return b;
}

function fakeSupabase(tables: Record<string, TableCfg>) {
  return { from: (t: string) => makeBuilder(tables[t] ?? {}) };
}

function req(body: unknown, raw = false) {
  return new Request("http://localhost/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/journal", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET()).status).toBe(401);
  });

  it("returns the owner's journals", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        journal: { rows: [{ id: "j1", titre: "Carnet de Rex" }] },
        journal_entry: { rows: [] },
      }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.owned).toHaveLength(1);
    expect(json.contributed).toHaveLength(0);
  });
});

describe("POST /api/journal", () => {
  it("400 on invalid input (missing animal)", async () => {
    const res = await POST(req({ titre: "Carnet" }));
    expect(res.status).toBe(400);
  });

  it("201 and inserts a journal with a public slug", async () => {
    const onInsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        journal: { single: { id: "j1", titre: "Carnet de Rex" }, onInsert },
      }) as never,
    );
    const res = await POST(req({ titre: "Carnet de Rex", nom_animal: "Rex", type_animal: "chien" }));
    expect(res.status).toBe(201);
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ proprietaire_id: "u1", nom_animal: "Rex" }),
    );
    expect(onInsert.mock.calls[0][0].public_slug).toMatch(/^carnet-de-rex-/);
  });
});
