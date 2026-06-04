"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

export default function NotificationCenter() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/history?userId=${user.id}&includeRead=true&limit=20`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      
      const unreadRes = await fetch(`/api/notifications/check?userId=${user.id}`);
      const unreadData = await unreadRes.json();
      setUnreadCount(unreadData.unreadCount || 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    try {
      await fetch("/api/notifications/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, userId: user.id }),
      });
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await fetch("/api/notifications/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true, userId: user.id }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  // 监听新通知事件
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      setUnreadCount(prev => prev + 1);
      loadNotifications();
    };

    window.addEventListener('new-notification', handleNewNotification as EventListener);
    return () => window.removeEventListener('new-notification', handleNewNotification as EventListener);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return "Hier";
    return date.toLocaleDateString("fr-FR");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking": return "📅";
      case "journal": return "📔";
      case "moderation": return "⚠️";
      default: return "🐾";
    }
  };

  return (
    <div className="relative">
      {/* 铃铛图标 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <div className="p-8 text-center text-gray-400">
                  <div className="animate-pulse">Chargement...</div>
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm">Aucune notification</p>
                </div>
              )}

              {!loading && notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${!notif.is_read ? "bg-teal-50/30" : ""}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getIcon(notif.type)}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notif.body}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{formatDate(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-teal-500 rounded-full mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}