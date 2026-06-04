import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface NotificationData {
  userId: string;
  title: string;
  body: string;
  type?: 'booking' | 'journal' | 'moderation' | 'info';
  relatedId?: string;
}

/**
 * 创建单条通知
 */
export async function createNotification(data: NotificationData) {
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: data.userId,
      title: data.title,
      body: data.body,
      type: data.type || 'info',
      related_id: data.relatedId,
      is_read: false,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[NOTIFICATION] Error creating notification:", error);
    throw error;
  }

  console.log(`[NOTIFICATION] Created for user ${data.userId}: ${data.title}`);
}

/**
 * 批量创建通知（发送给多个用户）
 */
export async function createBulkNotifications(
  userIds: string[],
  data: Omit<NotificationData, 'userId'>
) {
  if (userIds.length === 0) return;

  const notifications = userIds.map(userId => ({
    user_id: userId,
    title: data.title,
    body: data.body,
    type: data.type || 'info',
    related_id: data.relatedId,
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("notifications")
    .insert(notifications);

  if (error) {
    console.error("[NOTIFICATION] Error creating bulk notifications:", error);
    throw error;
  }

  console.log(`[NOTIFICATION] Created ${notifications.length} notifications`);
}

/**
 * 获取用户未读通知数量
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("[NOTIFICATION] Error getting unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * 标记通知为已读
 */
export async function markAsRead(notificationId: string, userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    console.error("[NOTIFICATION] Error marking as read:", error);
    throw error;
  }
}

/**
 * 标记用户所有通知为已读
 */
export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("[NOTIFICATION] Error marking all as read:", error);
    throw error;
  }
}