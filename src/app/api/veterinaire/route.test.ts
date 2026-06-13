import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET, PUT } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  single?: Record<string, unknown> | null;
  onUpsert?: (p: Record<string, unknown>) => void;
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
        upsert: (p: Record<string, unknown>) => { c.onUpsert?.(p); return b; },
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
      return b;
    },
  };
}

function put(body: unknown) {
  return new Request("http://localhost/api/veterinaire", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/veterinaire", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET()).status).toBe(401);
  });

  it("404 when the profile is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await GET()).status).toBe(404);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "suspendu" } } }) as never,
    );
    expect((await GET()).status).toBe(403);
  });

  it("200 with null when no vet record exists", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "u1", statut_compte: "actif" } },
        info_veterinaire: { row: null },
      }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).veterinaire).toBeNull();
  });
});

describe("PUT /api/veterinaire", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await PUT(put({}))).status).toBe(401);
  });

  it("404 when the profile is missing", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await PUT(put({ nom_clinique: "X" }))).status).toBe(404);
  });

  it("200 and upserts scoped to the caller's id", async () => {
    const onUpsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: { id_user: "owner1", statut_compte: "actif" } },
        info_veterinaire: { single: { id: "v1" }, onUpsert },
      }) as never,
    );
    const res = await PUT(put({ nom_clinique: "VetCare", telephone: "0102" }));
    expect(res.status).toBe(200);
    expect(onUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ proprietaire_id: "owner1", nom_clinique: "VetCare" }),
    );
  });
});
