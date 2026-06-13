import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { POST } from "./route";

type TableCfg = { row?: Record<string, unknown> | null; onUpsert?: (p: Record<string, unknown>) => void };

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        upsert: (p: Record<string, unknown>) => { c.onUpsert?.(p); return b; },
        then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      };
      return b;
    },
  };
}

function post(body: unknown) {
  return new Request("http://localhost/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/keys", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(post({ public_key: "QUJD" }))).status).toBe(401);
  });

  it("400 on an invalid public key", async () => {
    expect((await POST(post({ public_key: "not valid !!" }))).status).toBe(400);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "suspendu" } } }) as never,
    );
    expect((await POST(post({ public_key: "QUJD" }))).status).toBe(403);
  });

  it("200 and upserts the key scoped to the caller", async () => {
    const onUpsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1", statut_compte: "actif" } },
        user_public_key: { onUpsert },
      }) as never,
    );
    const res = await POST(post({ public_key: "QUJDRA==" }));
    expect(res.status).toBe(200);
    expect(onUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateur_id: "u1", public_key: "QUJDRA==" }),
    );
  });
});
