"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export default function NotificationHandler() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    // 请求通知权限
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    let interval: NodeJS.Timeout;

    const checkNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications/check?userId=${user.id}`);
        const data = await res.json();
        
        if (data.hasNew && Notification.permission === "granted") {
          new Notification(`🐾 ${data.title || "PAWLY"}`, {
            body: data.message,
            icon: "/pawly-icon.png",
          });
          
          window.dispatchEvent(new CustomEvent('new-notification', { 
            detail: { unreadCount: data.unreadCount }
          }));
        }
      } catch (error) {
        // 静默失败
      }
    };

    checkNotifications();
    interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, [isSignedIn, user?.id]);

  return null;
}