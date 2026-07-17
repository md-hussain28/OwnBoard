import { z } from "zod";

export const notificationTypeSchema = z.enum(["assignment", "overdue", "outcome", "digest"]);

export const notificationSchema = z
  .object({
    id: z.string(),
    type: notificationTypeSchema,
    title: z.string(),
    body: z.string().nullable(),
    link: z.string().nullable(),
    read_at: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));

export const unreadCountSchema = z
  .object({ unread: z.number() })
  .transform((c) => ({ unread: c.unread }));

export const notificationListSchema = z.array(notificationSchema);

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type UnreadCount = z.infer<typeof unreadCountSchema>;
