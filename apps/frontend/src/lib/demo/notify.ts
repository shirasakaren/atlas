/**
 * Create a notification for a user (visible in the bell, /notifications,
 * and pushed live over the notifications socket when it targets the persona).
 */
import { ME_ID } from './config';
import { newId } from './prng';
import { notifications } from './store';
import { pushToClients } from './realtime';
import type { NotificationRec } from './schema';
import type { NotificationType } from '@/lib/types';

export function notify(
  userId: string,
  n: {
    type: NotificationType;
    title: string;
    body: string;
    link?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): NotificationRec | null {
  // Only the persona has an inbox in the demo; ignore everybody else.
  if (userId !== ME_ID) return null;
  const rec: NotificationRec = {
    id: newId('ntf'),
    userId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link ?? null,
    metadata: n.metadata ?? null,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  notifications().insert(rec);
  pushToClients('/notifications', 'notification', rec);
  pushToClients('/notifications', 'notification:new', rec);
  return rec;
}
