import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificationData {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number;
}

// Global notification state
let notificationQueue: NotificationData[] = [];
let notificationCallback: ((notifications: NotificationData[]) => void) | null = null;

export const showNotification = (notification: Omit<NotificationData, "id">) => {
  const newNotification: NotificationData = {
    ...notification,
    id: Date.now().toString(),
    duration: notification.duration || 3000,
  };
  
  notificationQueue.push(newNotification);
  
  if (notificationCallback) {
    notificationCallback([...notificationQueue]);
  }

  // Auto remove after duration
  setTimeout(() => {
    removeNotification(newNotification.id);
  }, newNotification.duration);
};

export const removeNotification = (id: string) => {
  notificationQueue = notificationQueue.filter(n => n.id !== id);
  
  if (notificationCallback) {
    notificationCallback([...notificationQueue]);
  }
};

const iconMap = {
  success: CheckCircle,
  info: Clock,
  warning: AlertCircle,
  error: AlertCircle,
};

const colorMap = {
  success: "text-secondary",
  info: "text-primary",
  warning: "text-accent",
  error: "text-danger",
};

export default function NotificationToast() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    notificationCallback = setNotifications;
    return () => {
      notificationCallback = null;
    };
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];
        const iconColor = colorMap[notification.type];
        
        return (
          <Card key={notification.id} className="w-80 shadow-lg animate-in slide-in-from-right">
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-5 w-5 p-0"
                  onClick={() => removeNotification(notification.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
