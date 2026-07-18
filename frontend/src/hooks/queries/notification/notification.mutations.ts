import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/hooks/queries/notification/notification.queries";
import { cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries/optimistic";
import type { Notification, UnreadCount } from "@/schemas/notification.schema";
import { notificationService } from "@/services/notification.service";

/** A stand-in read timestamp for the optimistic flip; the real value arrives on refetch. */
const OPTIMISTIC_READ_AT = "1970-01-01T00:00:00.000Z";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: (id) => {
      const wasUnread = queryClient
        .getQueryData<Notification[]>(notificationKeys.all)
        ?.some((n) => n.id === id && !n.readAt);
      return optimisticEdits(queryClient, [
        cacheEdit<Notification[]>(notificationKeys.all, (prev) =>
          prev?.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: OPTIMISTIC_READ_AT } : n)),
        ),
        cacheEdit<UnreadCount>(notificationKeys.unreadCount(), (prev) =>
          prev && wasUnread ? { unread: Math.max(0, prev.unread - 1) } : prev,
        ),
      ]);
    },
    onError: (_err, _id, context) => rollbackEdits(queryClient, context),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onMutate: () =>
      optimisticEdits(queryClient, [
        cacheEdit<Notification[]>(notificationKeys.all, (prev) =>
          prev?.map((n) => (n.readAt ? n : { ...n, readAt: OPTIMISTIC_READ_AT })),
        ),
        cacheEdit<UnreadCount>(notificationKeys.unreadCount(), () => ({ unread: 0 })),
      ]),
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
