import { describe, it, expect } from "vitest";
import { dispatchTool, TOOL_NAMES, ASSISTANT_TOOLS, type ToolContext } from "./tools";
import type { AccountUser } from "@/lib/account";

// A minimal chainable Supabase stub: every query method returns the same
// builder, which is awaitable and resolves to the result registered for the
// queried table. Enough to exercise the dispatcher without a real database.
type Result = { data: unknown; error: { message: string } | null };

function makeSupabase(byTable: Record<string, Result>) {
  const calls: { table: string; eq: Record<string, unknown> }[] = [];
  return {
    calls,
    client: {
      from(table: string) {
        const record = { table, eq: {} as Record<string, unknown> };
        calls.push(record);
        const result = byTable[table] ?? { data: [], error: null };
        const builder: Record<string, unknown> = {};
        for (const m of ["select", "order", "limit"]) builder[m] = () => builder;
        builder.eq = (col: string, val: unknown) => {
          record.eq[col] = val;
          return builder;
        };
        builder.then = (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve);
        return builder;
      },
    },
  };
}

const account: AccountUser = {
  id_user: "user-1",
  role: "proprietaire",
  statut_compte: "actif",
  prenom: "Firas",
  nom: "A",
  email: "f@x.fr",
};

const ctxWith = (byTable: Record<string, Result>) => {
  const supa = makeSupabase(byTable);
  const ctx = { supabase: supa.client as unknown as ToolContext["supabase"], account };
  return { ctx, supa };
};

describe("tool schemas", () => {
  it("advertises exactly the dispatchable tools", () => {
    expect(TOOL_NAMES.sort()).toEqual(
      ["find_nearby_vets", "get_my_bookings", "get_my_journal"].sort(),
    );
    expect(ASSISTANT_TOOLS.every((t) => t.type === "function")).toBe(true);
  });
});

describe("dispatchTool", () => {
  it("returns an error payload for an unknown tool", async () => {
    const { ctx } = ctxWith({});
    const out = JSON.parse(await dispatchTool("nope", undefined, ctx));
    expect(out.error).toMatch(/inconnu/i);
  });

  it("find_nearby_vets filters by ville and caps results", async () => {
    const clinics = [
      { id: "1", nom: "Clinique Lyon", ville: "Lyon" },
      { id: "2", nom: "Clinique Paris", ville: "Paris" },
    ];
    const { ctx } = ctxWith({ veterinaire_clinique: { data: clinics, error: null } });
    const out = JSON.parse(await dispatchTool("find_nearby_vets", { ville: "lyon" }, ctx));
    expect(out.count).toBe(1);
    expect(out.cliniques[0].ville).toBe("Lyon");
  });

  it("get_my_bookings scopes the query to the caller", async () => {
    const { ctx, supa } = ctxWith({
      offre_garde: { data: [{ id: "b1", statut: "accepte" }], error: null },
    });
    const out = JSON.parse(await dispatchTool("get_my_bookings", undefined, ctx));
    expect(out.count).toBe(1);
    expect(supa.calls[0].table).toBe("offre_garde");
    expect(supa.calls[0].eq.proprietaire_id).toBe("user-1");
  });

  it("get_my_journal returns the user's carnets", async () => {
    const { ctx } = ctxWith({
      journal: { data: [{ id: "j1", titre: "Rex" }], error: null },
    });
    const out = JSON.parse(await dispatchTool("get_my_journal", "{}", ctx));
    expect(out.journaux[0].titre).toBe("Rex");
  });

  it("propagates a DB error as a structured payload", async () => {
    const { ctx } = ctxWith({
      offre_garde: { data: null, error: { message: "boom" } },
    });
    const out = JSON.parse(await dispatchTool("get_my_bookings", undefined, ctx));
    expect(out.error).toBe("boom");
  });

  it("tolerates malformed JSON args", async () => {
    const { ctx } = ctxWith({ veterinaire_clinique: { data: [], error: null } });
    const out = JSON.parse(await dispatchTool("find_nearby_vets", "{bad json", ctx));
    expect(out.count).toBe(0);
  });
});
