import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { DELETE } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  onUpdate?: (p: Record<string, unknown>) => void;
  onDelete?: () => void;
};

function makeBuilder(cfg: TableCfg) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    update: (p: Record<string, unknown>) => { cfg.onUpdate?.(p); return b; },
    delete: () => { cfg.onDelete?.(); return b; },
    maybeSingle: async () => ({ data: cfg.row ?? null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  };
  return b;
}

function fakeSupabase(tables: Record<string, TableCfg>) {
  return { from: (t: string) => makeBuilder(tables[t] ?? {}) };
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const REQ = new Request("http://localhost/api/admin/reviews/a1", { method: "DELETE" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("DELETE /api/admin/reviews/:id", () => {
  it("403 for a non-admin", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", role: "proprietaire" } } }) as never,
    );
    expect((await DELETE(REQ, params("a1"))).status).toBe(403);
  });

  it("404 when the review does not exist", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "admin1", role: "admin" } },
        avis_offre: { row: null },
      }) as never,
    );
    expect((await DELETE(REQ, params("a1"))).status).toBe(404);
  });

  it("200, rolls back the average and deletes the review", async () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "admin1", role: "admin" } },
        avis_offre: { row: { id: "a1", note: 5, prestataire_id: "sitter1" }, onDelete },
        prestataire_profil: { row: { note_moyenne: 4.5, nb_avis: 2 }, onUpdate },
      }) as never,
    );
    const res = await DELETE(REQ, params("a1"));
    expect(res.status).toBe(200);
    // (4.5*2 - 5) / 1 = 4
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ note_moyenne: 4, nb_avis: 1 }));
    expect(onDelete).toHaveBeenCalled();
  });
});
