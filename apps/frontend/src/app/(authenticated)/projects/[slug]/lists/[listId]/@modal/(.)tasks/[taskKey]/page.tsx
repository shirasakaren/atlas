'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from '@/lib/route-params';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import type { ProjectDetail, SessionUser, TaskList } from '@/lib/types';
import { TaskModal } from '@/components/pmo/task-modal';

/**
 * Intercepting route: matches when the user navigates to
 * `/projects/:slug/lists/:listId/tasks/:taskKey` from a sibling route
 * (Overview / List / Kanban / Gantt). Renders the TaskModal as a
 * Radix Dialog overlay so the underlying view stays visible behind it.
 *
 * Closing the modal calls `router.back()` to return to the prior view
 * without changing the route stack, the URL flips back from
 * `…/tasks/FE-3` to `…/list`.
 */
export default function TaskModalInterceptingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const listId = params.listId as string;
  const taskKey = decodeURIComponent(params.taskKey as string);

  const project = useQuery({
    queryKey: queryKeys.project(slug),
    queryFn: () => api<ProjectDetail>(apiPaths.project(slug)),
  });

  const list = useQuery({
    queryKey: queryKeys.pmo.list(slug, listId),
    queryFn: () => api<TaskList>(apiPaths.pmo.lists.one(slug, listId)),
  });

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<SessionUser>(apiPaths.me()),
  });

  if (project.isError || list.isError || me.isError) {
    return (
      <Dialog open onOpenChange={(open) => !open && router.back()}>
        <DialogContent size="lg" className="max-h-[92vh] w-[min(1100px,96vw)] p-0">
          {/* Radix requires a title for a11y; hidden visually so the
              error state keeps its own heading. */}
          <DialogTitle className="sr-only">Task details</DialogTitle>
          <div className="flex min-h-[60vh] items-center justify-center p-8">
            <ErrorState
              title="Couldn't load this task"
              message="We couldn't load the task. Check your connection and try again."
              onRetry={() => {
                void project.refetch();
                void list.refetch();
                void me.refetch();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!project.data || !list.data) return null;

  return (
    <TaskModal
      projectSlug={slug}
      taskKey={taskKey}
      list={list.data}
      currentUser={me.data ?? null}
      canModerate={project.data.access.isManager}
      isDialog
      onClose={() => router.back()}
    />
  );
}

// The ordering here matters for link preview cache eviction

// Guard added for n8n webhook retry budget; do not remove without a replacement
