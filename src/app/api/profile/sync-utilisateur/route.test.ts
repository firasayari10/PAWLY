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
  onUpdate?: (p: Record<string, unknown>) => void;
};

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        single: async () => ({ data: c.single ?? null, error: null }),
        insert: (p: Record<string, unknown>) => { c.onInsert?.(p); return b; },
        update: (p: Record<string, unknown>) => { c.onUpdate?.(p); return b; },
        then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      };
      return b;
    },
  };
}

function post(body: unknown) {
  return new Request("http://localhost/api/profile/sync-utilisateur", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/profile/sync-utilisateur", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(post({ userId: "clerk_1" }))).status).toBe(401);
  });

  it("403 when syncing a different user's id (IDOR guard)", async () => {
    const res = await POST(post({ userId: "clerk_999", email: "x@y.z" }));
    expect(res.status).toBe(403);
  });

  it("400 when userId is missing", async () => {
    expect((await POST(post({ email: "x@y.z" }))).status).toBe(400);
  });

  it("creates the user on first login", async () => {
    const onInsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: null, single: { id_user: "new", clerk_id: "clerk_1" }, onInsert },
      }) as never,
    );
    const res = await POST(post({ userId: "clerk_1", email: "a@b.c", prenom: "Ann", nom: "Lee" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/synced/);
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ clerk_id: "clerk_1", prenom: "Ann", nom: "Lee", role: "proprietaire" }),
    );
  });

  it("updates changed Clerk fields for an existing user", async () => {
    const onUpdate = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: {
          row: { clerk_id: "clerk_1", prenom: "Old", nom: "Name", telephone: null },
          onUpdate,
        },
      }) as never,
    );
    const res = await POST(post({ userId: "clerk_1", prenom: "New" }));
    expect(res.status).toBe(200);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ prenom: "New" }));
  });

  it("no-ops when the existing user is already up to date", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { clerk_id: "clerk_1", prenom: "Same", nom: "User", telephone: null } },
      }) as never,
    );
    const res = await POST(post({ userId: "clerk_1", prenom: "Same", nom: "User" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/up to date/);
  });
});
