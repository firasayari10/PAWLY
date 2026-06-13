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
  return new Request("http://localhost/api/admin/users/u2", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("PATCH /api/admin/users/:id", () => {
  it("400 on an invalid action", async () => {
    const res = await PATCH(patchReq({ action: "bannir" }), params("u2"));
    expect(res.status).toBe(400);
  });

  it("403 for a non-admin", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", role: "prestataire" } } }) as never,
    );
    expect((await PATCH(patchReq({ action: "suspendre" }), params("u2"))).status).toBe(403);
  });

  it("409 when an admin targets their own account", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "admin1", role: "admin" } } }) as never,
    );
    expect((await PATCH(patchReq({ action: "suspendre" }), params("admin1"))).status).toBe(409);
  });

  it("200 and suspends the target user", async () => {
    const onUpdate = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: {
          row: { id_user: "admin1", role: "admin" },
          single: { id_user: "u2", statut_compte: "suspendu" },
          onUpdate,
        },
      }) as never,
    );
    const res = await PATCH(patchReq({ action: "suspendre" }), params("u2"));
    expect(res.status).toBe(200);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ statut_compte: "suspendu" }));
  });
});
