'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from '@/lib/route-params';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CalendarRange, Flag, Users } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { RichTextEditor } from '@/components/rich-text/editor';
import { MemberPicker } from '@/components/pmo/member-picker';
import { DatePickerPopover, formatDueDate } from '@/components/pmo/date-picker-popover';
import { PriorityChip } from '@/components/pmo/priority-chip';
import { StatusPill } from '@/components/pmo/status-pill';
import { cn } from '@/lib/utils';
import type { Task, TaskList, TaskPriority } from '@/lib/types';
import { TASK_PRIORITY_LABEL, TASK_PRIORITY_ORDER } from '@/lib/types';

/**
 * Dedicated task creation page. Replaces the inline "+ Add task" row
 * as the full-fat creation surface: description, assignees, dates,
 * priority and status are all set before the task is filed.
 */
export default function NewTaskPage() {
  const params = useParams();
  const slug = params.slug as string;
  const listId = params.listId as string;
  const queryClient = useQueryClient();
  const toast = useToast();
  usePageTitle('New task');

  const list = useQuery({
    queryKey: queryKeys.pmo.list(slug, listId),
    queryFn: () => api<TaskList>(apiPaths.pmo.lists.one(slug, listId)),
  });

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState<object | null>(null);
  const [statusId, setStatusId] = React.useState<string | null>(null);
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState<string | null>(null);
  const [startDate, setStartDate] = React.useState<string | null>(null);
  const [priority, setPriority] = React.useState<TaskPriority>('MEDIUM');
  const [storyPoints, setStoryPoints] = React.useState('');

  // Default the status to the list's default ("Backlog") once loaded.
  React.useEffect(() => {
    if (!list.data) return;
    const statuses = [...list.data.statuses].sort((a, b) => a.order - b.order);
    setStatusId((current) => current ?? (statuses.find((s) => s.isDefault) ?? statuses[0])?.id ?? null);
  }, [list.data]);

  const create = useMutation({
    mutationFn: () =>
      api<Task>(apiPaths.pmo.tasks.create(slug, listId), {
        method: 'POST',
        body: {
          title: title.trim(),
          description: description ?? undefined,
          statusId: statusId ?? undefined,
          assigneeUserIds: assigneeIds.length > 0 ? assigneeIds : undefined,
          dueDate: dueDate ?? undefined,
          startDate: startDate ?? undefined,
          priority,
          storyPoints:
            storyPoints.trim() === '' ? undefined : Number.parseInt(storyPoints, 10),
        },
      }),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pmo.tasks(slug, listId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pmo.list(slug, listId) });
      toast.show({ tone: 'success', title: `Task ${task.key} created` });
      // A client-side navigation here would be intercepted by the
      // sibling @modal/(.)tasks/[taskKey] route (this page and the
      // task page are both direct children of [listId]), landing the
      // new task in a dialog stacked over this now-stale form instead
      // of its own full page. A full navigation bypasses interception.
      window.location.assign(`/projects/${slug}/lists/${listId}/tasks/${task.key}`);
    },
    onError: (err) =>
      toast.show({
        tone: 'danger',
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Could not create task',
      }),
  });

  const canSubmit = title.trim().length > 0 && !create.isPending;

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 tracking-[-0.01em] text-ink">New task</h1>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Files into <span className="font-medium text-ink-2">{list.data?.name ?? 'this list'}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left: title + description */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-task-title">Title</Label>
            <Input
              id="new-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={200}
              autoFocus
              className="text-[15px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <div className="rounded-lg border border-line bg-surface">
              <RichTextEditor
                value={(description as object) ?? {}}
                onChange={setDescription}
                placeholder="Add a description. Bold, italic, code, lists, links, images all supported."
                editable
              />
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="space-y-4 rounded-lg border border-line bg-surface p-4">
          <RailField icon={<Users className="h-3.5 w-3.5" strokeWidth={2.25} />} label="Assignees">
            <MemberPicker
              projectSlug={slug}
              selectedIds={assigneeIds}
              onToggle={(userId) =>
                setAssigneeIds((prev) =>
                  prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
                )
              }
              align="start"
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-muted"
                >
                  {assigneeIds.length === 0 ? (
                    <span className="text-[13px] text-ink-3">No one yet</span>
                  ) : (
                    <span className="text-[13px] text-ink">
                      {assigneeIds.length} {assigneeIds.length === 1 ? 'person' : 'people'}
                    </span>
                  )}
                </button>
              }
            />
          </RailField>

          <RailField label="Status">
            <div className="flex flex-wrap gap-1.5">
              {(list.data?.statuses ?? [])
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusId(s.id)}
                    className={cn(
                      'rounded px-1 py-0.5 transition-opacity',
                      s.id === statusId ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                    )}
                  >
                    <StatusPill status={s} size="sm" />
                  </button>
                ))}
            </div>
          </RailField>

          <RailField icon={<CalendarRange className="h-3.5 w-3.5" strokeWidth={2.25} />} label="Start date">
            <DatePickerPopover
              value={startDate}
              onChange={setStartDate}
              label="Start date"
              align="start"
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-muted"
                >
                  <span className={cn('text-[13px]', startDate ? 'text-ink' : 'text-ink-3')}>
                    {startDate ? formatDueDate(startDate) : 'Set start date'}
                  </span>
                </button>
              }
            />
          </RailField>

          <RailField icon={<Calendar className="h-3.5 w-3.5" strokeWidth={2.25} />} label="Due date">
            <DatePickerPopover
              value={dueDate}
              onChange={setDueDate}
              label="Due date"
              align="start"
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-muted"
                >
                  <span className={cn('text-[13px]', dueDate ? 'text-ink' : 'text-ink-3')}>
                    {dueDate ? formatDueDate(dueDate) : 'Set due date'}
                  </span>
                </button>
              }
            />
          </RailField>

          <RailField icon={<Flag className="h-3.5 w-3.5" strokeWidth={2.25} />} label="Priority">
            <div className="flex flex-wrap gap-1.5">
              {TASK_PRIORITY_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'rounded px-1 py-0.5 transition-opacity',
                    p === priority ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                  )}
                  title={TASK_PRIORITY_LABEL[p]}
                >
                  <PriorityChip priority={p} showNone={false} />
                </button>
              ))}
            </div>
          </RailField>

          <RailField label="Story points">
            <Input
              type="number"
              min={0}
              max={1000}
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              placeholder="Not estimated"
              className="h-8 w-28 text-[13px]"
            />
          </RailField>
        </aside>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href={`/projects/${slug}/lists/${listId}` as never}>Cancel</Link>
        </Button>
        <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!canSubmit}>
          Create task
        </Button>
      </div>
    </div>
  );
}

function RailField({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-3">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
