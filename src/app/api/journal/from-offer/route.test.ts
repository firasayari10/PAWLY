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

function makeBuilder(cfg: TableCfg) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    insert: (p: Record<string, unknown>) => { cfg.onInsert?.(p); return b; },
    maybeSingle: async () => ({ data: cfg.row ?? null, error: null }),
    single: async () => ({ data: cfg.single ?? null, error: null }),
  };
  return b;
}

function fakeSupabase(tables: Record<string, TableCfg>) {
  return { from: (t: string) => makeBuilder(tables[t] ?? {}) };
}

function req(body: unknown) {
  return new Request("http://localhost/api/journal/from-offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OFFRE = { id: "o1", proprietaire_id: "owner-2", nom_animal: "Rex", type_animal: "chien", statut: "accepte" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/journal/from-offer", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(req({ offre_id: "o1" }))).status).toBe(401);
  });

  it("400 when offre_id is missing", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it("403 when the caller has no accepted garde for this booking", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "sitter-1" } }, offre_garde: { row: null } }) as never,
    );
    expect((await POST(req({ offre_id: "o1" }))).status).toBe(403);
  });

  it("200 and returns the existing journal", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "sitter-1" } },
        offre_garde: { row: OFFRE },
        journal: { row: { id: "j1" } },
      }) as never,
    );
    const res = await POST(req({ offre_id: "o1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).journal.id).toBe("j1");
  });

  it("201 and creates the owner's journal when none exists", async () => {
    const onInsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "sitter-1" } },
        offre_garde: { row: OFFRE },
        journal: { row: null, single: { id: "j2" }, onInsert },
      }) as never,
    );
    const res = await POST(req({ offre_id: "o1" }));
    expect(res.status).toBe(201);
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ proprietaire_id: "owner-2", nom_animal: "Rex" }),
    );
  });
});
