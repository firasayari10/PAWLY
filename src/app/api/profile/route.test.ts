import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET, PUT } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  single?: Record<string, unknown> | null;
  onUpdate?: (p: Record<string, unknown>) => void;
  onUpsert?: (p: Record<string, unknown>) => void;
};

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        order: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        single: async () => ({ data: c.single ?? null, error: null }),
        update: (p: Record<string, unknown>) => { c.onUpdate?.(p); return b; },
        upsert: (p: Record<string, unknown>) => { c.onUpsert?.(p); return b; },
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
      return b;
    },
  };
}

function put(body: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/profile", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET()).status).toBe(401);
  });

  it("404 when the profile does not exist", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase({ utilisateur: { row: null } }) as never);
    expect((await GET()).status).toBe(404);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "suspendu" } } }) as never,
    );
    expect((await GET()).status).toBe(403);
  });

  it("200 and flattens the prestataire_profil array", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: {
          row: {
            id_user: "u1", role: "prestataire", statut_compte: "actif",
            prestataire_profil: [{ id: "pp1", bio: "Bonjour" }],
          },
        },
      }) as never,
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.prestataire_profil).toMatchObject({ id: "pp1", bio: "Bonjour" });
  });
});

describe("PUT /api/profile", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await PUT(put({ prenom: "X" }))).status).toBe(401);
  });

  it("400 on an invalid role", async () => {
    const res = await PUT(put({ role: "superadmin" }));
    expect(res.status).toBe(400);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "suspendu" } } }) as never,
    );
    expect((await PUT(put({ prenom: "Nope" }))).status).toBe(403);
  });

  it("400 when no modification is supplied", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { id_user: "u1", statut_compte: "actif" } } }) as never,
    );
    expect((await PUT(put({}))).status).toBe(400);
  });

  it("200 and updates the profile", async () => {
    const onUpdate = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: {
          row: { id_user: "u1", role: "proprietaire", statut_compte: "actif" },
          single: { id_user: "u1", role: "proprietaire" },
        },
        prestataire_profil: { onUpdate },
      }) as never,
    );
    const res = await PUT(put({ prenom: "Nouveau" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/mis à jour/);
  });
});
