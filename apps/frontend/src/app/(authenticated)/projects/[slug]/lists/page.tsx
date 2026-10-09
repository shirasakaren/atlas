'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useParams } from '@/lib/route-params';
import { useQuery } from '@tanstack/react-query';
import { Archive, ArrowLeft, ListTodo } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { isPmoEnabled } from '@/lib/hooks/use-pmo-enabled';
import { getStoredSession } from '@/lib/auth-client';
import { getLastListId } from '@/lib/pmo/last-list';
import type { TaskList } from '@/lib/types';

export default function TaskListsIndexPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const pmoEnabled = isPmoEnabled();

  const lists = useQuery({
    enabled: pmoEnabled,
    queryKey: queryKeys.pmo.lists(slug),
    queryFn: () => api<TaskList[]>(apiPaths.pmo.lists.list(slug)),
  });

  React.useEffect(() => {
    if (!lists.data) return;
    const active = lists.data.filter((l) => !l.archivedAt);
    if (active.length === 0) return;
    // "Task lists" opens the user's last opened list in this project,
    // falling back to the first active one (the /chat and project page
    // entry points share this rule).
    const lastId = getLastListId(slug, getStoredSession()?.user.id);
    const target = active.find((l) => l.id === lastId) ?? active[0];
    router.replace(`/projects/${slug}/lists/${target.id}` as never);
  }, [lists.data, slug, router]);

  if (!pmoEnabled) {
    return (
      <Container size="2xl" className="py-12">
        <h1 className="font-display text-h1 text-ink">Task lists</h1>
        <p className="mt-3 text-ink-2">PMO is not enabled on this deploy.</p>
      </Container>
    );
  }

  if (lists.isLoading) {
    return (
      <Container size="2xl" className="py-12">
        <div className="h-12 w-48 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  if (lists.isError) {
    return (
      <Container size="2xl" className="py-12">
        <h1 className="font-display text-h1 text-ink">Task lists</h1>
        <p className="mt-3 text-brand-red">Could not load task lists.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href={`/projects/${slug}` as never}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Back to project
          </Link>
        </Button>
      </Container>
    );
  }

  // All lists archived → the redirect above only fires for an active
  // list, so this would otherwise masquerade as "no lists yet".
  const allArchived =
    lists.data && lists.data.length > 0 && lists.data.every((l) => !!l.archivedAt);
  if (allArchived) {
    return (
      <Container size="2xl" className="py-16">
        <div className="mx-auto max-w-prose text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-ink-3">
            <Archive className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="font-display text-h1 text-ink">All task lists are archived</h1>
          <p className="mt-3 text-ink-2">
            Every task list in this project is archived. Unarchive one from the project page to
            bring it back.
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href={`/projects/${slug}` as never}>
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
              Back to project
            </Link>
          </Button>
        </div>
      </Container>
    );
  }

  // No lists at all → empty state with link back.
  return (
    <Container size="2xl" className="py-16">
      <div className="mx-auto max-w-prose text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-ink-3">
          <ListTodo className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <h1 className="font-display text-h1 text-ink">No task lists yet</h1>
        <p className="mt-3 text-ink-2">
          Task lists group work for a role on this project. Open the project page and use the “+”
          next to <strong>Task lists</strong> in the sidebar to create one.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href={`/projects/${slug}` as never}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Back to project
          </Link>
        </Button>
      </div>
    </Container>
  );
}

// Bounded on purpose: feature flag rollout checklist must not grow unbounded
