// ============================================================
// PAWLY — Assistant tools (function calling)
// Defines the read-only tools the assistant can call to answer questions about
// the signed-in user's own Pawly data, plus a dispatcher that runs them under
// the caller's account. Every query is scoped to `account.id_user`, so a user
// can only ever see their own data. Data access mirrors the existing API routes.
// ============================================================

import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { createServerSupabase } from "@/lib/supabase-server";
import type { AccountUser } from "@/lib/account";
import { filterClinicsByVille, type Clinique } from "@/lib/veterinaires";

type ServerSupabase = ReturnType<typeof createServerSupabase>;

export interface ToolContext {
  supabase: ServerSupabase;
  account: AccountUser;
}

/** Tool schemas advertised to the model. */
export const ASSISTANT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_nearby_vets",
      description:
        "Liste des cliniques vétérinaires référencées dans Pawly, éventuellement filtrées par ville. À utiliser quand l'utilisateur cherche un vétérinaire.",
      parameters: {
        type: "object",
        properties: {
          ville: {
            type: "string",
            description: "Ville pour filtrer les cliniques (optionnel).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_bookings",
      description:
        "Les réservations de garde de l'utilisateur connecté (statut, dates, animal, tarif). À utiliser pour toute question sur « mes réservations ».",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_journal",
      description:
        "Les carnets de journal de l'utilisateur connecté (titre, animal). À utiliser pour toute question sur « mes journaux / carnets ».",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

/** Names the dispatcher knows how to run. */
export const TOOL_NAMES = ASSISTANT_TOOLS.map((t) => t.function.name);

/**
 * Run one tool by name and return a JSON string suitable for a `tool` message.
 * Unknown tools and DB errors return a structured `{ error }` payload rather
 * than throwing, so the model can recover gracefully.
 */
export async function dispatchTool(
  name: string,
  rawArgs: string | Record<string, unknown> | undefined,
  ctx: ToolContext,
): Promise<string> {
  const args = parseArgs(rawArgs);

  switch (name) {
    case "find_nearby_vets":
      return findNearbyVets(ctx, typeof args.ville === "string" ? args.ville : undefined);
    case "get_my_bookings":
      return getMyBookings(ctx);
    case "get_my_journal":
      return getMyJournal(ctx);
    default:
      return JSON.stringify({ error: `Outil inconnu : ${name}` });
  }
}

function parseArgs(raw: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function findNearbyVets(ctx: ToolContext, ville?: string): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("veterinaire_clinique")
    .select("id, nom, adresse, ville, code_postal, telephone, email, latitude, longitude")
    .order("ville", { ascending: true });

  if (error) return JSON.stringify({ error: error.message });

  let clinics = (data ?? []) as Clinique[];
  if (ville) clinics = filterClinicsByVille(clinics, ville);
  clinics = clinics.slice(0, 10);

  return JSON.stringify({
    count: clinics.length,
    cliniques: clinics.map((c) => ({
      nom: c.nom,
      ville: c.ville,
      adresse: c.adresse,
      code_postal: c.code_postal,
      telephone: c.telephone,
    })),
  });
}

async function getMyBookings(ctx: ToolContext): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("offre_garde")
    .select("id, type_animal, nom_animal, date_debut, date_fin, statut, statut_paiement, tarif_total, created_at")
    .eq("proprietaire_id", ctx.account.id_user)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ count: (data ?? []).length, reservations: data ?? [] });
}

async function getMyJournal(ctx: ToolContext): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("journal")
    .select("id, titre, nom_animal, type_animal, is_public, updated_at")
    .eq("proprietaire_id", ctx.account.id_user)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ count: (data ?? []).length, journaux: data ?? [] });
}
