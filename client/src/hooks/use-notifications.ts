import { useEffect, useState } from "react";

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true,
  });

  useEffect(() => {
    // Check initial permission state
    const updatePermission = () => {
      if (!("Notification" in window)) {
        setPermission({ granted: false, denied: true, default: false });
        return;
      }

      setPermission({
        granted: Notification.permission === "granted",
        denied: Notification.permission === "denied",
        default: Notification.permission === "default",
      });
    };

    updatePermission();
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
      return { granted: false, denied: true, default: false };
    }

    if (Notification.permission === "granted") {
      return { granted: true, denied: false, default: false };
    }

    if (Notification.permission === "denied") {
      return { granted: false, denied: true, default: false };
    }

    const result = await Notification.requestPermission();
    const newPermission = {
      granted: result === "granted",
      denied: result === "denied",
      default: result === "default",
    };

    setPermission(newPermission);
    return newPermission;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return null;
    }

    return new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
  };

  const showTimerNotification = (message: string, type: "start" | "pause" | "stop") => {
    const titles = {
      start: "Timer Iniciado",
      pause: "Timer Pausado", 
      stop: "Timer Finalizado",
    };

    return showNotification(titles[type], {
      body: message,
      tag: "timer-notification", // Replace previous timer notifications
    });
  };

  return {
    permission,
    requestPermission,
    showNotification,
    showTimerNotification,
    isSupported: "Notification" in window,
  };
}
