import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  single?: Record<string, unknown> | null;
};

function fakeSupabase(tables: Record<string, TableCfg>) {
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
  };
}

const params = Promise.resolve({ offreId: "off1" });
const ME = { id_user: "owner1", statut_compte: "actif", prenom: "Sam", nom: "Owner" };
const ACCEPTED = { id: "off1", proprietaire_id: "owner1", prestataire_id: "sitter1", statut: "accepte" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/conversations/:offreId", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(new Request("http://x"), { params })).status).toBe(401);
  });

  it("403 when the caller is not a participant (IDOR / enumeration guard)", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: ME },
        offre_garde: { row: { ...ACCEPTED, proprietaire_id: "x", prestataire_id: "y" } },
      }) as never,
    );
    expect((await GET(new Request("http://x"), { params })).status).toBe(403);
  });

  it("403 when the booking is not accepted", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: ME },
        offre_garde: { row: { ...ACCEPTED, statut: "en_attente" } },
      }) as never,
    );
    expect((await GET(new Request("http://x"), { params })).status).toBe(403);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { ...ME, statut_compte: "suspendu" } } }) as never,
    );
    expect((await GET(new Request("http://x"), { params })).status).toBe(403);
  });

  it("200 returns the conversation and the peer's public key", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: ME },
        offre_garde: { row: ACCEPTED },
        chat_conversation: { single: { id: "c1", offre_id: "off1", proprietaire_id: "owner1", prestataire_id: "sitter1" } },
        user_public_key: { row: { public_key: "PEERKEY" } },
      }) as never,
    );
    const res = await GET(new Request("http://x"), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.conversation.id).toBe("c1");
    expect(json.peer.id_user).toBe("sitter1");
    expect(json.peer.public_key).toBe("PEERKEY");
  });
});
