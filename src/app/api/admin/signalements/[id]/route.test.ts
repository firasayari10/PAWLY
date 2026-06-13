import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { PATCH } from "./route";

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

function patchReq(body: unknown) {
  return new Request("http://localhost/api/admin/signalements/s1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("PATCH /api/admin/signalements/:id", () => {
  it("400 on an invalid action", async () => {
    expect((await PATCH(patchReq({ action: "ignorer" }), params("s1"))).status).toBe(400);
  });

  it("403 for a non-admin", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", role: "proprietaire" } } }) as never,
    );
    expect((await PATCH(patchReq({ action: "resoudre" }), params("s1"))).status).toBe(403);
  });

  it("409 when the report is already handled", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "admin1", role: "admin" } },
        signalement: { row: { id: "s1", statut: "resolu" } },
      }) as never,
    );
    expect((await PATCH(patchReq({ action: "resoudre" }), params("s1"))).status).toBe(409);
  });

  it("200 and resolves an open report", async () => {
    const onUpdate = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "admin1", role: "admin" } },
        signalement: { row: { id: "s1", statut: "ouvert" }, single: { id: "s1", statut: "resolu" }, onUpdate },
      }) as never,
    );
    const res = await PATCH(patchReq({ action: "resoudre" }), params("s1"));
    expect(res.status).toBe(200);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ statut: "resolu" }));
  });
});
