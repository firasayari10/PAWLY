import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 获取用户所有通知（历史记录）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeRead = searchParams.get("includeRead") === "true";

    if (!userId) {
      return NextResponse.json({ error: "userId manquant" }, { status: 400 });
    }

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeRead) {
      query = query.eq("is_read", false);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_HISTORY] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}