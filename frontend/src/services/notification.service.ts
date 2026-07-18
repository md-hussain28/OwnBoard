import { API_ENDPOINTS, getApiClient } from "@/lib/api";
import {
  type Notification,
  notificationListSchema,
  type UnreadCount,
  unreadCountSchema,
} from "@/schemas";

export const notificationService = {
  async list(): Promise<Notification[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.notifications);
    return notificationListSchema.parse(data);
  },

  async unreadCount(): Promise<UnreadCount> {
    const { data } = await getApiClient().get(API_ENDPOINTS.notificationsUnreadCount);
    return unreadCountSchema.parse(data);
  },

  async markRead(id: string): Promise<void> {
    await getApiClient().post(API_ENDPOINTS.notificationRead(id));
  },

  async markAllRead(): Promise<void> {
    await getApiClient().post(API_ENDPOINTS.notificationsReadAll);
  },
};
