import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const [usersRes, gardesRes, signalementsRes, avisRes] = await Promise.all([
    supabase.from("utilisateur").select("*", { count: "exact", head: true }),
    supabase.from("gardes").select("*", { count: "exact", head: true }),
    supabase.from("avis").select("*", { count: "exact", head: true }).eq("signale", true),
    supabase.from("avis").select("note"),
  ]);

  const notes = avisRes.data || [];
  const avgNote = notes.length > 0
    ? notes.reduce((acc, n) => acc + n.note, 0) / notes.length
    : 0;

  return NextResponse.json({
    totalUsers: usersRes.count || 0,
    totalGardes: gardesRes.count || 0,
    signalements: signalementsRes.count || 0,
    noteMoyenne: avgNote.toFixed(1),
  });
}