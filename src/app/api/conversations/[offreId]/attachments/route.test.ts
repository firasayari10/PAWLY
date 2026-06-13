import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET, POST } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  single?: Record<string, unknown> | null;
};

type StorageCfg = {
  signedUpload?: { data: { token: string } | null; error: { message: string } | null };
  signedUrl?: { data: { signedUrl: string } | null; error: { message: string } | null };
};

function fakeSupabase(tables: Record<string, TableCfg>, storage: StorageCfg = {}) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        upsert: () => b,
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        single: async () => ({ data: c.single ?? null, error: null }),
      };
      return b;
    },
    storage: {
      from: () => ({
        createSignedUploadUrl: vi.fn(async () =>
          storage.signedUpload ?? { data: { token: "tok-1" }, error: null },
        ),
        createSignedUrl: vi.fn(async () =>
          storage.signedUrl ?? { data: { signedUrl: "https://storage/signed" }, error: null },
        ),
      }),
    },
  };
}

const params = Promise.resolve({ offreId: "off1" });
const ME = { id_user: "owner1", statut_compte: "actif" };
const ACCEPTED = { id: "off1", proprietaire_id: "owner1", prestataire_id: "sitter1", statut: "accepte" };
const CONV = { single: { id: "c1" } };

const BASE_TABLES = {
  utilisateur: { row: ME },
  offre_garde: { row: ACCEPTED },
  chat_conversation: CONV,
};

function post(body: unknown) {
  return new Request("http://localhost/api/conversations/off1/attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function get(path: string) {
  return new Request(
    `http://localhost/api/conversations/off1/attachments?path=${encodeURIComponent(path)}`,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("POST /api/conversations/:offreId/attachments", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await POST(post({ mime: "image/jpeg", size: 100 }), { params })).status).toBe(401);
  });

  it("400 on an unsupported mime or invalid size", async () => {
    expect((await POST(post({ mime: "application/pdf", size: 100 }), { params })).status).toBe(400);
    expect((await POST(post({ mime: "image/jpeg", size: 0 }), { params })).status).toBe(400);
    expect((await POST(post({ mime: "image/jpeg", size: 11 * 1024 * 1024 }), { params })).status).toBe(400);
  });

  it("403 for a non-participant", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        ...BASE_TABLES,
        offre_garde: { row: { ...ACCEPTED, proprietaire_id: "x", prestataire_id: "y" } },
      }) as never,
    );
    expect((await POST(post({ mime: "image/jpeg", size: 100 }), { params })).status).toBe(403);
  });

  it("403 when the booking is not accepted", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        ...BASE_TABLES,
        offre_garde: { row: { ...ACCEPTED, statut: "en_attente" } },
      }) as never,
    );
    expect((await POST(post({ mime: "image/jpeg", size: 100 }), { params })).status).toBe(403);
  });

  it("201 returns a conversation-scoped path and an upload token", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(BASE_TABLES) as never);
    const res = await POST(post({ mime: "video/mp4", size: 1024 }), { params });
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.token).toBe("tok-1");
    expect(j.path).toMatch(/^c1\/[A-Za-z0-9-]+$/);
  });
});

describe("GET /api/conversations/:offreId/attachments", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(get("c1/abc"), { params })).status).toBe(401);
  });

  it("403 when the path belongs to another conversation or is malformed", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(BASE_TABLES) as never);
    expect((await GET(get("c2/abc"), { params })).status).toBe(403);
    expect((await GET(get("c1/../secret"), { params })).status).toBe(403);
    expect((await GET(get(""), { params })).status).toBe(403);
  });

  it("200 returns a signed download URL", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(BASE_TABLES) as never);
    const res = await GET(get("c1/abc-123"), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://storage/signed");
  });

  it("404 when the object does not exist", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase(BASE_TABLES, {
        signedUrl: { data: null, error: { message: "Object not found" } },
      }) as never,
    );
    expect((await GET(get("c1/abc-123"), { params })).status).toBe(404);
  });
});
