import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET, PATCH } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  single?: Record<string, unknown> | null;
  onUpdate?: (p: Record<string, unknown>) => void;
};

function makeBuilder(cfg: TableCfg) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    update: (p: Record<string, unknown>) => { cfg.onUpdate?.(p); return b; },
    maybeSingle: async () => ({ data: cfg.row ?? null, error: null }),
    single: async () => ({ data: cfg.single ?? null, error: null }),
  };
  return b;
}

function fakeSupabase(tables: Record<string, TableCfg>) {
  return { from: (t: string) => makeBuilder(tables[t] ?? {}) };
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const GETREQ = new Request("http://localhost/api/journal/j1");

function patchReq(body: unknown) {
  return new Request("http://localhost/api/journal/j1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/journal/:id", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(GETREQ, params("j1"))).status).toBe(401);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "suspendu" } } }) as never,
    );
    expect((await GET(GETREQ, params("j1"))).status).toBe(403);
  });

  it("404 when the journal does not exist", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1" } }, journal: { row: null } }) as never,
    );
    expect((await GET(GETREQ, params("j1"))).status).toBe(404);
  });

  it("403 when the caller is neither owner nor contributor", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        journal: { row: { id: "j1", proprietaire_id: "someone-else", journal_entry: [] } },
      }) as never,
    );
    expect((await GET(GETREQ, params("j1"))).status).toBe(403);
  });

  it("200 for the owner, with entries sorted newest-first", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        journal: {
          row: {
            id: "j1",
            proprietaire_id: "u1",
            journal_entry: [
              { id: "e1", created_at: "2026-01-01", auteur_id: "u1" },
              { id: "e2", created_at: "2026-02-01", auteur_id: "u1" },
            ],
          },
        },
      }) as never,
    );
    const res = await GET(GETREQ, params("j1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isOwner).toBe(true);
    expect(json.journal.journal_entry[0].id).toBe("e2");
  });
});

describe("PATCH /api/journal/:id", () => {
  it("403 when the caller is not the owner", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        journal: { row: { id: "j1", proprietaire_id: "other" } },
      }) as never,
    );
    expect((await PATCH(patchReq({ is_public: true }), params("j1"))).status).toBe(403);
  });

  it("200 toggles public visibility for the owner", async () => {
    const onUpdate = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        journal: { row: { id: "j1", proprietaire_id: "u1" }, single: { id: "j1", is_public: true }, onUpdate },
      }) as never,
    );
    const res = await PATCH(patchReq({ is_public: true }), params("j1"));
    expect(res.status).toBe(200);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_public: true }));
  });
});
