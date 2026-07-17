import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications(options?: {
  enabled?: boolean;
  refetchInterval?: number | false;
}) {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: notificationService.list,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

export function useUnreadNotificationsCount(options?: {
  enabled?: boolean;
  refetchInterval?: number | false;
}) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationService.unreadCount,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}
