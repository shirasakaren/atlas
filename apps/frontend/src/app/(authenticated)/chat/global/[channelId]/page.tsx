'use client';

import { useParams } from '@/lib/route-params';
import { getStoredSession } from '@/lib/auth-client';
import { ChatLayout } from '@/components/chat/chat-layout';
import { usePageTitle } from '@/lib/page-title';

/**
 * Workspace-global channel view (e.g. the workspace #general). Every
 * authenticated user can read and write; admins manage. No project
 * query needed, the channel carries no project context.
 */
export default function GlobalChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const session = getStoredSession();
  usePageTitle('Workspace chat');

  if (!session) return null;

  return (
    <ChatLayout
      scope={{ kind: 'global' }}
      projectId={null}
      channelId={channelId}
      currentUserId={session.user.id}
      isManager={session.user.isAdmin === true}
    />
  );
}

// See the incident notes for release-please tag drift before changing defaults
