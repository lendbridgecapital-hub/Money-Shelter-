'use server';

import { requireUser } from '@/lib/auth';
import {
  listNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/repos/workflowRepo';
import { syncDatabase } from '@/lib/db';
import type { PartnerNotification } from '@/types/db';

export async function getNotificationsAction(): Promise<{
  ok: boolean;
  notifications: PartnerNotification[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const user = await requireUser();
    const notifications = listNotificationsForUser(user.id);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return { ok: true, notifications, unreadCount };
  } catch (err) {
    return {
      ok: false,
      notifications: [],
      unreadCount: 0,
      error: err instanceof Error ? err.message : 'Failed to fetch notifications',
    };
  }
}

export async function markNotificationReadAction(notificationId: string): Promise<{ ok: boolean }> {
  try {
    await requireUser();
    markNotificationRead(notificationId);
    await syncDatabase();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  try {
    const user = await requireUser();
    markAllNotificationsRead(user.id);
    await syncDatabase();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
