"use client";

import {
  AlarmClock,
  Bell,
  CheckCheck,
  CircleCheck,
  FileText,
  Loader2Icon,
  type LucideIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/queries/notification";
import { cn } from "@/lib";
import type { Notification, NotificationType } from "@/schemas";
import { Button, Popover, PopoverContent, PopoverTrigger, Skeleton } from "@/ui";

const POLL_MS = 45_000;

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  assignment: FileText,
  overdue: AlarmClock,
  outcome: CircleCheck,
  digest: Users,
};

const TYPE_ACCENT: Record<NotificationType, string> = {
  assignment: "bg-brand-honey-soft text-brand-amber",
  overdue: "bg-brand-coral-soft text-brand-coral",
  outcome: "bg-brand-moss-soft text-brand-moss",
  digest: "bg-brand-info-soft text-brand-info",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotificationRow({
  notification,
  onNavigate,
  onMarkRead,
}: {
  notification: Notification;
  onNavigate: () => void;
  onMarkRead: (id: string) => void;
}) {
  const Icon = TYPE_ICON[notification.type];
  const unread = notification.readAt === null;
  const when = relativeTime(notification.createdAt);

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          unread ? TYPE_ACCENT[notification.type] : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm",
              unread ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
            )}
          >
            {notification.title}
          </span>
          {unread && (
            <span className="size-1.5 shrink-0 rounded-full bg-brand-coral" aria-label="Unread" />
          )}
        </span>
        {notification.body && (
          <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
            {notification.body}
          </span>
        )}
        {when && (
          <span className="mt-1 block text-xs tabular-nums text-muted-foreground">{when}</span>
        )}
      </span>
    </>
  );

  const className = cn(
    "flex gap-3 rounded-lg px-3 py-2.5 transition-[background-color,transform] duration-200",
    "hover:bg-muted active:scale-[0.99]",
    unread && "bg-brand-honey-soft/40",
  );

  function handleClick() {
    if (unread) onMarkRead(notification.id);
    onNavigate();
  }

  if (notification.link) {
    return (
      <li>
        <Link href={notification.link} onClick={handleClick} className={className}>
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (unread) onMarkRead(notification.id);
        }}
        className={cn(className, "w-full text-left")}
      >
        {body}
      </button>
    </li>
  );
}

function NotificationsBody({
  isLoading,
  isError,
  notifications,
  unread,
  onClose,
  onMarkRead,
  onMarkAll,
  markAllPending,
}: {
  isLoading: boolean;
  isError: boolean;
  notifications: Notification[];
  unread: number;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
  markAllPending: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5">
        <div>
          <p className="text-sm font-semibold text-balance">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {unread === 0 ? "You're all caught up" : `${unread} unread`}
          </p>
        </div>
        {unread > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-brand-teal hover:text-brand-teal"
            onClick={onMarkAll}
            disabled={markAllPending}
          >
            {markAllPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2 p-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && isError && (
        <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">
          Could not load notifications.
        </p>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-3.5 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-moss-soft text-brand-moss">
            <Bell className="size-4" />
          </span>
          <p className="text-sm font-medium">Nothing new</p>
          <p className="text-xs text-pretty text-muted-foreground">
            Assignments, quiz results, and reminders show up here.
          </p>
        </div>
      )}

      {!isLoading && !isError && notifications.length > 0 && (
        <ul className="max-h-80 space-y-0.5 overflow-y-auto p-1.5">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onNavigate={onClose}
              onMarkRead={onMarkRead}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Unified topbar notification inbox. Backed by the server-side notification feed
 * (assignment / overdue / outcome / digest), polled every 45s. Replaces the older
 * split employee/admin bells.
 */
export function NotificationBell() {
  const countQuery = useUnreadNotificationsCount({ refetchInterval: POLL_MS });
  const notificationsQuery = useNotifications({ refetchInterval: POLL_MS });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);

  const notifications = notificationsQuery.data ?? [];
  const unread = countQuery.data?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "Notifications"
          }
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span
              className={cn(
                "absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full",
                "bg-brand-coral px-1 text-[0.625rem] font-semibold leading-none text-white tabular-nums",
                "shadow-[0_0_0_2px_var(--background)]",
              )}
              aria-hidden
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <NotificationsBody
          isLoading={notificationsQuery.isLoading}
          isError={notificationsQuery.isError}
          notifications={notifications}
          unread={unread}
          onClose={() => setOpen(false)}
          onMarkRead={(id) => markRead.mutate(id)}
          onMarkAll={() => markAll.mutate()}
          markAllPending={markAll.isPending}
        />
      </PopoverContent>
    </Popover>
  );
}
