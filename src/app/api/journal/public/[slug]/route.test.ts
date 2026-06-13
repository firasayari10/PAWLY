import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { createServerSupabase } from "@/lib/supabase-server";
import { GET } from "./route";

function fakeSupabase(row: Record<string, unknown> | null) {
  return {
    from: () => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return b;
    },
  };
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const REQ = new Request("http://localhost/api/journal/public/x");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/journal/public/:slug", () => {
  it("404 when the journal does not exist", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(null) as never);
    expect((await GET(REQ, params("nope"))).status).toBe(404);
  });

  it("404 when the journal is private", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ public_slug: "x", is_public: false, journal_entry: [] }) as never,
    );
    expect((await GET(REQ, params("x"))).status).toBe(404);
  });

  it("200 with sorted entries when public", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        public_slug: "x",
        is_public: true,
        journal_entry: [
          { id: "e1", created_at: "2026-01-01" },
          { id: "e2", created_at: "2026-03-01" },
        ],
      }) as never,
    );
    const res = await GET(REQ, params("x"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.journal.journal_entry[0].id).toBe("e2");
  });
});
