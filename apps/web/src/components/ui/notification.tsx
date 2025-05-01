"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose?: () => void;
}

export const Notification = ({
  message,
  type = "success",
  duration = 3000,
  onClose,
}: NotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md py-2 px-4 shadow-lg transition-all duration-300",
        type === "success" && "bg-gray-800 text-white",
        type === "error" && "bg-red-600 text-white",
        type === "info" && "bg-blue-600 text-white"
      )}
    >
      {type === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      <span>{message}</span>
    </div>
  );
};

export const NotificationContainer = () => {
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; type: "success" | "error" | "info" }>
  >([]);

  // Add a notification
  const addNotification = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    return id;
  };

  // Remove a notification
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Expose methods to window for global access
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.showNotification = addNotification;
    }

    return () => {
      if (typeof window !== "undefined" && 'showNotification' in window) {
        // Use TypeScript-safe way to delete the property
        window.showNotification = undefined as any;
      }
    };
  }, []);

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

// Add type declaration for window
declare global {
  interface Window {
    showNotification: (
      message: string,
      type?: "success" | "error" | "info"
    ) => string;
  }
}
