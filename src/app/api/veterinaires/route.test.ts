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
        order: () => b,
        then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
      };
      return b;
    },
  };
}

const CLINICS = [
  { id: "c1", nom: "Vét Paris", ville: "Paris", latitude: 48.86, longitude: 2.35 },
  { id: "c2", nom: "Vét Lyon", ville: "Lyon", latitude: 45.77, longitude: 4.83 },
];

function reqWith(ville?: string) {
  const url = ville
    ? `http://localhost/api/veterinaires?ville=${encodeURIComponent(ville)}`
    : "http://localhost/api/veterinaires";
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/veterinaires", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(reqWith())).status).toBe(401);
  });

  it("returns all clinics by default", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(CLINICS) as never);
    const res = await GET(reqWith());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(2);
  });

  it("filters by city", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(fakeSupabase(CLINICS) as never);
    const res = await GET(reqWith("lyon"));
    const json = await res.json();
    expect(json.count).toBe(1);
    expect(json.cliniques[0].id).toBe("c2");
  });
});
