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
  return new Request("http://localhost/api/signalements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/signalements", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(req({ type: "avis", cible_id: "a1", motif: "spam" }))).status).toBe(401);
  });

  it("400 on an invalid type", async () => {
    const res = await POST(req({ type: "autre", cible_id: "a1", motif: "spam" }));
    expect(res.status).toBe(400);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "suspendu" } } }) as never,
    );
    const res = await POST(req({ type: "profil", cible_id: "p9", motif: "abus" }));
    expect(res.status).toBe(403);
  });

  it("201 and records the reporter", async () => {
    const onInsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1" } },
        signalement: { single: { id: "s1" }, onInsert },
      }) as never,
    );
    const res = await POST(req({ type: "profil", cible_id: "p9", motif: "Comportement abusif" }));
    expect(res.status).toBe(201);
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "profil", cible_id: "p9", signale_par: "u1", statut: "ouvert" }),
    );
  });
});
