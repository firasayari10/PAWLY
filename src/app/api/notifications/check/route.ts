import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 获取用户未读通知
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId manquant" }, { status: 400 });
    }

    // 获取未读通知列表
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    // 获取未读数量
    const { count: unreadCount, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (countError) throw countError;

    // 返回第一条未读通知用于浏览器推送
    const hasNew = data && data.length > 0;
    const latestNotification = hasNew ? data[0] : null;

    return NextResponse.json({
      hasNew,
      unreadCount: unreadCount || 0,
      title: latestNotification?.title || "",
      message: latestNotification?.body || "",
      notifications: data || [],
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_CHECK] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 标记通知为已读
export async function POST(request: Request) {
  try {
    const { notificationId, userId, markAll } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId manquant" }, { status: 400 });
    }

    if (markAll) {
      // 标记所有通知为已读
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      return NextResponse.json({ success: true, markAll: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId manquant" }, { status: 400 });
    }

    // 标记单条通知为已读
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[NOTIFICATIONS_MARK_READ] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}