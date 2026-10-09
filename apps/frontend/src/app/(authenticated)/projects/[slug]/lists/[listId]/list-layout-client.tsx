'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useParams } from '@/lib/route-params';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Archive, ChevronsUpDown, Info, Plus, Settings2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { isPmoEnabled } from '@/lib/hooks/use-pmo-enabled';
import { getStoredSession } from '@/lib/auth-client';
import { setLastListId } from '@/lib/pmo/last-list';
import { isInsider, type ProjectDetail, type ProjectDetailInsider, type TaskList } from '@/lib/types';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePageTitle } from '@/lib/page-title';
import { Badge } from '@/components/ui/badge';
import { pmoBgClass, pmoFgClass } from '@/components/pmo/color-picker';
import { ListNavbar } from '@/components/pmo/list-navbar';
import { ListSettingsDialog } from '@/components/pmo/list-settings-dialog';
import { LucideIcon } from '@/components/pmo/lucide-icon';

export default function TaskListLayoutClient({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.slug as string;
  const listId = params.listId as string;
  const pmoEnabled = isPmoEnabled();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const project = useQuery({
    enabled: pmoEnabled,
    queryKey: queryKeys.project(slug),
    queryFn: () => api<ProjectDetail>(apiPaths.project(slug)),
  });

  const list = useQuery({
    enabled: pmoEnabled,
    queryKey: queryKeys.pmo.list(slug, listId),
    queryFn: () => api<TaskList>(apiPaths.pmo.lists.one(slug, listId)),
  });

  // Every sub-view used to inherit just the list name, so Kanban, Timeline,
  // Notes and the rest were indistinguishable in tabs and history.
  const pathname = usePathname();
  const viewLabel = React.useMemo(() => {
    const base = `/projects/${slug}/lists/${listId}`;
    const rest = pathname.startsWith(base) ? pathname.slice(base.length) : '';
    const seg = rest.split('/').filter(Boolean);
    if (seg.length === 0) return 'Overview';
    const labels: Record<string, string> = {
      list: 'List',
      kanban: 'Kanban',
      timeline: 'Timeline',
      team: 'Team',
      files: 'Files',
      notes: 'Notes',
      whiteboards: 'Whiteboards',
      tasks: 'Task',
      tabs: 'Tab',
    };
    const label = labels[seg[0]] ?? 'Overview';
    // /tasks/<KEY> reads better as the task key itself.
    if (seg[0] === 'tasks' && seg[1]) return decodeURIComponent(seg[1]);
    return label;
  }, [pathname, slug, listId]);

  usePageTitle(
    list.data?.name ? `${viewLabel} · ${list.data.name}` : `${viewLabel} · Task list`,
  );

  // Remember this list as the user's last opened one in this project,
  // so the project page / "Task lists" button reopen it directly.
  const openedListId = list.data?.id;
  React.useEffect(() => {
    if (!openedListId) return;
    setLastListId(slug, openedListId, getStoredSession()?.user.id);
  }, [slug, openedListId]);

  if (!pmoEnabled) {
    return (
      <Container size="2xl" className="py-12">
        <p className="text-ink-2">PMO is not enabled on this deploy.</p>
      </Container>
    );
  }

  if (project.isLoading || list.isLoading) {
    return (
      <div>
        <div className="border-b border-line bg-surface">
          <Container size="2xl" className="py-6">
            <div className="h-8 w-72 animate-pulse rounded bg-line" />
          </Container>
        </div>
      </div>
    );
  }

  if (project.isError || !project.data || list.isError || !list.data) {
    return (
      <Container size="2xl" className="py-16">
        <ErrorState
          page
          title="Couldn't load this task list"
          message="The task list couldn't be fetched. Check your connection and try again."
          onRetry={() => {
            project.refetch();
            list.refetch();
          }}
          className="max-w-lg mx-auto"
        />
        <div className="mt-6 text-center">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/projects/${slug}` as never}>
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
              Back to project
            </Link>
          </Button>
        </div>
      </Container>
    );
  }

  const insider = isInsider(project.data) ? (project.data as ProjectDetailInsider) : null;
  if (!insider) {
    return (
      <Container size="2xl" className="py-12">
        <p className="text-ink-2">Task lists are only available to project members.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href={`/projects/${slug}` as never}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Back to project
          </Link>
        </Button>
      </Container>
    );
  }

  const canManage = project.data.access.isManager;
  const data = list.data;

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col">
      {/* List header */}
      <div className="border-b border-line bg-surface">
        <Container size="2xl" className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded ${pmoBgClass(data.iconColor)}`}
                aria-hidden
              >
                <LucideIcon name={data.iconName} className={`h-5 w-5 ${pmoFgClass(data.iconColor)}`} />
              </span>
              {/* The title is a switcher: click it (chevrons signal it) to
                  change task lists without leaving this window. */}
              <ListSwitcher projectSlug={slug} currentList={data} projectTitle={project.data.title} />
              {data.archivedAt ? (
                <Badge tone="warning" uppercase>
                  <Archive className="mr-1 h-3 w-3" strokeWidth={2.25} />
                  Archived
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/projects/${slug}?view=details` as never}>
                  <Info className="h-4 w-4" strokeWidth={2.25} />
                  <span className="hidden sm:inline">Project details</span>
                </Link>
              </Button>
              {canManage ? (
                <Button asChild size="sm">
                  <Link href={`/projects/${slug}/lists/${listId}/tasks/new` as never}>
                    <Plus className="h-4 w-4" strokeWidth={2.25} />
                    New task
                  </Link>
                </Button>
              ) : null}
              {canManage ? (
                <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="h-4 w-4" strokeWidth={2.25} />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              ) : null}
            </div>
          </div>
        </Container>
      </div>

      {/* Local tab navbar */}
      <ListNavbar projectSlug={slug} list={data} canManage={canManage} />

      {/* Tab content */}
      <div className="flex-1 bg-surface">
        <Container size="2xl" className="py-8">
          {children}
        </Container>
      </div>

      {canManage ? (
        <ListSettingsDialog
          projectSlug={slug}
          list={data}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      ) : null}

      {/* Parallel slot for the task popup. Renders the Dialog when the
          user navigates from a sibling route (list/kanban/gantt) to
          tasks/:key. See @modal/(.)tasks/[taskKey]/page.tsx. */}
      {modal}
    </div>
  );
}

/**
 * The task list title in the window header. Clicking opens the picker
 * with every list in this project so the user can jump between lists
 * without ever leaving the task list window.
 */
function ListSwitcher({
  projectSlug,
  currentList,
  projectTitle,
}: {
  projectSlug: string;
  currentList: TaskList;
  projectTitle: string;
}) {
  const [open, setOpen] = React.useState(false);

  const lists = useQuery({
    enabled: open,
    queryKey: queryKeys.pmo.lists(projectSlug),
    queryFn: () => api<TaskList[]>(apiPaths.pmo.lists.list(projectSlug)),
    staleTime: 30_000,
  });

  const active = (lists.data ?? []).filter((l) => !l.archivedAt);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group/title flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-surface-muted"
          aria-label={`Task list: ${currentList.name}. Click to switch lists.`}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <h1 className="truncate font-display text-h2 tracking-[-0.01em] text-ink">
                {currentList.name}
              </h1>
              <ChevronsUpDown
                className="h-4 w-4 shrink-0 text-ink-3 opacity-60 transition-opacity group-hover/title:opacity-100"
                strokeWidth={2.25}
              />
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-ink-3">
              {projectTitle}
              {currentList.projectKey ? (
                <>
                  {' · '}
                  <code className="text-ink-2">{currentList.projectKey}</code>
                </>
              ) : null}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5">
        <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Switch task list
        </div>
        {lists.isLoading ? (
          <div className="h-8 animate-pulse rounded bg-surface-muted" />
        ) : lists.isError ? (
          <p className="px-2 py-3 text-center text-[13px] text-brand-red">
            Could not load task lists.
          </p>
        ) : active.length === 0 ? (
          <p className="px-2 py-3 text-center text-[13px] text-ink-3">No other task lists.</p>
        ) : (
          <ul className="max-h-72 overflow-auto">
            {active.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/projects/${projectSlug}/lists/${l.id}` as never}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded px-2 py-2 text-[14px] text-ink hover:bg-surface-muted"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${pmoBgClass(l.iconColor)}`}
                  >
                    <LucideIcon name={l.iconName} className={`h-4 w-4 ${pmoFgClass(l.iconColor)}`} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  {l.id === currentList.id ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue-strong" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Keep in sync with the docs section on Gantt timeline timezone offsets

// TODO(ops): confirm Postgres full-text search tuning behavior on the next staging deploy
