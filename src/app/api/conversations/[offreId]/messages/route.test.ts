import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ createServerSupabase: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { GET, POST } from "./route";

type TableCfg = {
  row?: Record<string, unknown> | null;
  rows?: Record<string, unknown>[];
  single?: Record<string, unknown> | null;
  onInsert?: (p: Record<string, unknown>) => void;
};

function fakeSupabase(tables: Record<string, TableCfg>) {
  return {
    from(table: string) {
      const c = tables[table] ?? {};
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        gt: () => b,
        order: () => b,
        upsert: () => b,
        insert: (p: Record<string, unknown>) => { c.onInsert?.(p); return b; },
        maybeSingle: async () => ({ data: c.row ?? null, error: null }),
        single: async () => ({ data: c.single ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: c.rows ?? [], error: null }),
      };
      return b;
    },
  };
}

const params = Promise.resolve({ offreId: "off1" });
const ME = { id_user: "owner1", statut_compte: "actif" };
const ACCEPTED = { id: "off1", proprietaire_id: "owner1", prestataire_id: "sitter1", statut: "accepte" };
const CONV = { single: { id: "c1" } };
// fakeSupabase keys: chat_conversation / chat_message (see sprint6.sql naming).

function post(body: unknown) {
  return new Request("http://localhost/api/conversations/off1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as unknown as Awaited<ReturnType<typeof auth>>);
});

describe("GET /api/conversations/:offreId/messages", () => {
  it("401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
    expect((await GET(new Request("http://x"), { params })).status).toBe(401);
  });

  it("403 for a non-participant", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: ME },
        offre_garde: { row: { ...ACCEPTED, proprietaire_id: "x", prestataire_id: "y" } },
      }) as never,
    );
    expect((await GET(new Request("http://x"), { params })).status).toBe(403);
  });

  it("200 returns the ciphertext history", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: ME },
        offre_garde: { row: ACCEPTED },
        chat_conversation: CONV,
        chat_message: { rows: [{ id: "m1", sender_id: "sitter1", ciphertext: "QUJD", iv: "EjRW" }] },
      }) as never,
    );
    const res = await GET(new Request("http://x"), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).messages).toHaveLength(1);
  });
});

describe("POST /api/conversations/:offreId/messages", () => {
  it("400 on a malformed payload", async () => {
    expect((await POST(post({ ciphertext: "not base64 !!", iv: "EjRW" }), { params })).status).toBe(400);
  });

  it("403 when the booking is not accepted", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: ME },
        offre_garde: { row: { ...ACCEPTED, statut: "en_attente" } },
      }) as never,
    );
    expect((await POST(post({ ciphertext: "QUJD", iv: "EjRW" }), { params })).status).toBe(403);
  });

  it("403 when the account is suspended", async () => {
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({ utilisateur: { row: { ...ME, statut_compte: "suspendu" } } }) as never,
    );
    expect((await POST(post({ ciphertext: "QUJD", iv: "EjRW" }), { params })).status).toBe(403);
  });

  it("201 and stores the message as the caller (sender_id = me)", async () => {
    const onInsert = vi.fn();
    vi.mocked(createServerSupabase).mockReturnValue(
      fakeSupabase({
        utilisateur: { row: ME },
        offre_garde: { row: ACCEPTED },
        chat_conversation: CONV,
        chat_message: { single: { id: "m1" }, onInsert },
      }) as never,
    );
    const res = await POST(post({ ciphertext: "QUJD", iv: "EjRW" }), { params });
    expect(res.status).toBe(201);
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_id: "c1", sender_id: "owner1", ciphertext: "QUJD", iv: "EjRW" }),
    );
  });
});
