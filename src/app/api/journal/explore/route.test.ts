import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET } from "./route";

function fakeSupabase(rows: Record<string, unknown>[]) {
  return {
    from: () => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
      };
      return b;
    },
  };
}

const JOURNALS = [
  {
    titre: "Journal de Rex",
    nom_animal: "Rex",
    type_animal: "chien",
    public_slug: "rex-1",
    is_public: true,
    proprietaire: { prenom: "Sarah" },
    journal_entry: [
      { id: "e1", titre: "Jour 1", contenu: "", created_at: "2026-05-01T10:00:00Z", journal_photo: [] },
      { id: "e2", titre: "Jour 2", contenu: "", created_at: "2026-05-02T10:00:00Z", journal_photo: [] },
    ],
  },
];

function reqWith(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/journal/explore?${sp}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/journal/explore", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(reqWith())).status).toBe(401);
  });

  it("returns flattened posts newest-first", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(JOURNALS) as never);
    const res = await GET(reqWith());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(2);
    expect(json.posts[0].entryId).toBe("e2");
  });

  it("filters by date", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(JOURNALS) as never);
    const res = await GET(reqWith({ date: "2026-05-01" }));
    const json = await res.json();
    expect(json.count).toBe(1);
    expect(json.posts[0].entryId).toBe("e1");
  });
});
