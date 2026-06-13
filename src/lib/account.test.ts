import { describe, it, expect } from "vitest";
import { accountAccessError, resolveAccount, SUSPENDED } from "./account";

describe("accountAccessError", () => {
  it("blocks a suspended account with 403", () => {
    expect(accountAccessError(SUSPENDED)).toEqual({ status: 403, error: "Compte suspendu." });
  });

  it("allows active / pending / unknown statuses", () => {
    expect(accountAccessError("actif")).toBeNull();
    expect(accountAccessError("en_attente")).toBeNull();
    expect(accountAccessError(null)).toBeNull();
    expect(accountAccessError(undefined)).toBeNull();
  });
});

function fakeSupabase(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  return {
    from: () => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data, error }),
      };
      return b;
    },
  };
}

describe("resolveAccount", () => {
  it("404 when no profile exists", async () => {
    const r = await resolveAccount(fakeSupabase(null) as never, "clerk_1");
    expect(r).toEqual({ ok: false, status: 404, error: "Profil introuvable." });
  });

  it("403 when the account is suspended", async () => {
    const r = await resolveAccount(
      fakeSupabase({ id_user: "u1", statut_compte: "suspendu" }) as never,
      "clerk_1",
    );
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it("returns the user when active", async () => {
    const r = await resolveAccount(
      fakeSupabase({ id_user: "u1", role: "proprietaire", statut_compte: "actif" }) as never,
      "clerk_1",
    );
    expect(r).toEqual({ ok: true, user: { id_user: "u1", role: "proprietaire", statut_compte: "actif" } });
  });

  it("returns the user when status is null/unknown", async () => {
    const r = await resolveAccount(fakeSupabase({ id_user: "u1" }) as never, "clerk_1");
    expect(r.ok).toBe(true);
  });

  it("500 on a database error", async () => {
    const r = await resolveAccount(fakeSupabase(null, { message: "db down" }) as never, "clerk_1");
    expect(r).toMatchObject({ ok: false, status: 500 });
  });
});
