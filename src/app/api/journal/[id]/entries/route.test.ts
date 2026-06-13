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
    update: () => b,
    insert: (p: Record<string, unknown>) => { cfg.onInsert?.(p); return b; },
    maybeSingle: async () => ({ data: cfg.row ?? null, error: null }),
    single: async () => ({ data: cfg.single ?? null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  };
  return b;
}

function fakeSupabase(tables: Record<string, TableCfg>, onUpload?: (path: string) => void) {
  return {
    from: (t: string) => makeBuilder(tables[t] ?? {}),
    storage: {
      from: () => ({
        upload: async (path: string) => { onUpload?.(path); return { data: { path }, error: null }; },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  };
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function entryRequest(fields: Record<string, string>, photos: File[] = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  for (const p of photos) fd.append("photos", p);
  return new Request("http://localhost/api/journal/j1/entries", { method: "POST", body: fd });
}

function pngFile(name = "p.png") {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type: "image/png" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/journal/:id/entries", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    const res = await POST(entryRequest({ titre: "Jour 1" }), params("j1"));
    expect(res.status).toBe(401);
  });

  it("400 when the title is missing", async () => {
    const res = await POST(entryRequest({ contenu: "Belle journée" }), params("j1"));
    expect(res.status).toBe(400);
  });

  it("403 when a stranger (no booking) tries to post", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        journal: { row: { id: "j1", proprietaire_id: "owner-2" } },
      }) as never,
    );
    const res = await POST(entryRequest({ titre: "Jour 1" }), params("j1"));
    expect(res.status).toBe(403);
  });

  it("201 for the owner, uploading a photo", async () => {
    const onEntryInsert = vi.fn();
    const onUpload = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase(
        {
          utilisateur: { row: { id_user: "u1" } },
          journal: { row: { id: "j1", proprietaire_id: "u1" } },
          journal_entry: { single: { id: "e1" }, onInsert: onEntryInsert },
          journal_photo: { single: { id: "p1", url: "https://cdn.test/j1/x.png" } },
        },
        onUpload,
      ) as never,
    );
    const res = await POST(entryRequest({ titre: "Jour 1", contenu: "RAS" }, [pngFile()]), params("j1"));
    expect(res.status).toBe(201);
    expect(onEntryInsert).toHaveBeenCalledWith(expect.objectContaining({ journal_id: "j1", auteur_id: "u1" }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it("201 for a sitter with an accepted booking", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "sitter-1" } },
        journal: { row: { id: "j1", proprietaire_id: "owner-2" } },
        offre_garde: { row: { id: "o1" } },
        journal_entry: { single: { id: "e1" } },
      }) as never,
    );
    const res = await POST(entryRequest({ titre: "Update", offre_id: "o1" }), params("j1"));
    expect(res.status).toBe(201);
  });
});
