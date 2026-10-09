'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from '@/lib/route-params';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import type { ChatChannel } from '@/lib/types';
import { usePageTitle } from '@/lib/page-title';

/**
 * Project-chat entry point. Resolves the channel list client-side
 * (RSC fetches don't carry the user's session today, see frontend
 * CLAUDE.md auth caveat) and redirects to #general, or the first
 * non-archived channel if for some reason #general is missing.
 */
export default function ProjectChatIndexPage() {
  usePageTitle('Chat');
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const channelsQuery = useQuery({
    queryKey: queryKeys.chat.channels(slug),
    queryFn: () => api<ChatChannel[]>(apiPaths.chat.channels(slug)),
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (!channelsQuery.data) return;
    const target =
      channelsQuery.data.find((c) => c.isGeneral) ??
      channelsQuery.data.find((c) => !c.isArchived);
    if (target) router.replace(`/projects/${slug}/chat/${target.id}` as never);
  }, [channelsQuery.data, router, slug]);

  return (
    <div className="grid h-full flex-1 place-items-center">
      <Loader2 className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
    </div>
  );
}
