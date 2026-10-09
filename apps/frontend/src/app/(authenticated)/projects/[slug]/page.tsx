'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from '@/lib/route-params';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ExternalLink,
  Figma,
  GitBranch,
  Globe,
  KanbanSquare,
  MessagesSquare,
  Settings2,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import { isInsider, type ProjectDetail, type ProjectDetailInsider, type SessionUser } from '@/lib/types';
import { Container } from '@/components/layout/container';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { MediaHero } from '@/components/projects/media-hero';
import { PhaseBadge } from '@/components/projects/project-thumbnail';
import { ContributeModal } from '@/components/projects/contribute-modal';
import { BookmarkButton } from '@/components/projects/bookmark-button';
import { RichTextEditor } from '@/components/rich-text/editor';
import { TaskListsSidebar } from '@/components/pmo/task-lists-sidebar';
import { isPmoEnabled } from '@/lib/hooks/use-pmo-enabled';
import { PROJECT_PHASE_LABEL } from '@/lib/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.projectWithMe(slug),
    queryFn: async () => {
      const [projectData, userData] = await Promise.all([
        api<ProjectDetail>(apiPaths.project(slug)),
        api<SessionUser>(apiPaths.session()).catch(() => null),
      ]);
      return { project: projectData, me: userData };
    },
  });

  usePageTitle(data?.project.title ?? 'Project');

  // Team members land straight in their last opened task list instead
  // of the marketing-style description page. `?view=details` (the small
  // "Project details" button inside the task list window) skips this so
  // the description page stays reachable. Redirect through the task
  // lists index (not straight to a remembered list id) so the
  // remembered id is re-validated against the project's current lists
  // every time, rather than potentially bouncing to one that's since
  // been deleted, which would 404 and loop back here.
  const redirectProject = data?.project;
  const willRedirectToLastList =
    !!redirectProject && isInsider(redirectProject) && !redirectProject.archivedAt &&
    isPmoEnabled() && searchParams.get('view') !== 'details';

  React.useEffect(() => {
    if (!willRedirectToLastList || !redirectProject) return;
    router.replace(`/projects/${redirectProject.slug}/lists` as never);
  }, [willRedirectToLastList, redirectProject, router]);

  if (willRedirectToLastList) {
    return (
      <Container size="2xl" className="space-y-10 py-10">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  if (isError) {
    return (
      <Container size="2xl" className="space-y-10 py-10">
        <ErrorState
          page
          title="Couldn't load this project"
          message="Something went wrong while fetching the project. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Container>
    );
  }

  if (isLoading || !data) {
    return (
      <Container size="2xl" className="space-y-10 py-10">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  const project = data.project;
  const me = data.me;

  const insider = isInsider(project) ? (project as ProjectDetailInsider) : null;
  const canContribute =
    !!me &&
    project.access.level !== 'admin' &&
    project.access.level !== 'manager' &&
    project.access.level !== 'contributor' &&
    !project.archivedAt;

  return (
    <>
      <Container size="2xl" className="space-y-10 py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Link
              href={'/projects'}
              className="-my-2 inline-block py-2 text-[13px] font-medium text-ink-3 hover:text-ink"
            >
              ← All projects
            </Link>
            <h1 className="mt-4 font-display text-display-lg tracking-[-0.02em] text-ink">
              {project.title}
            </h1>
            <p className="mt-3 max-w-prose text-body-lg text-ink-2">{project.shortDescription}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <PhaseBadge phase={project.phase} />
              {project.tags.map((t) => (
                <Badge key={t.id} tone="neutral">
                  {t.name}
                </Badge>
              ))}
              {project.archivedAt ? (
                <Badge tone="warning" uppercase>
                  Archived
                </Badge>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {canContribute ? (
                <Button asChild size="lg">
                  <Link href={`/projects/${project.slug}?contribute=1`}>
                    Contribute to this project
                  </Link>
                </Button>
              ) : null}
              {project.access.isManager ? (
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/projects/${project.slug}/manage`}>
                    <Settings2 className="h-4 w-4" strokeWidth={2.25} />
                    Manage
                  </Link>
                </Button>
              ) : null}
              {project.access.isInsider && isPmoEnabled() ? (
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/projects/${project.slug}/lists` as never}>
                    <KanbanSquare className="h-4 w-4" strokeWidth={2.25} />
                    Task lists
                  </Link>
                </Button>
              ) : null}
              {project.access.isInsider ? (
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/projects/${project.slug}/chat` as never}>
                    <MessagesSquare className="h-4 w-4" strokeWidth={2.25} />
                    Chat
                  </Link>
                </Button>
              ) : null}
              <BookmarkButton projectId={project.id} bookmarked={project.bookmarked ?? false} />
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="space-y-4 rounded-lg border border-line p-5">
              <Section title="Owner">
                <div className="flex items-center gap-3">
                  <Avatar src={project.owner.avatarUrl} name={project.owner.name} size={40} />
                  <div>
                    <div className="text-[14px] font-medium text-ink">{project.owner.name}</div>
                    {insider ? (
                      <div className="text-[12px] text-ink-3">{insider.ownerEmail}</div>
                    ) : null}
                  </div>
                </div>
              </Section>

              {project.managers.length > 0 ? (
                <Section title="Project managers">
                  <ul className="space-y-2">
                    {project.managers.map((m) => (
                      <li key={m.id} className="flex items-center gap-2.5">
                        <Avatar src={m.avatarUrl} name={m.name} size={28} />
                        <span className="text-[13px] text-ink">{m.name}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <Section title="Team">
                <span className="inline-flex items-center gap-1.5 text-[14px] text-ink">
                  <Users className="h-3.5 w-3.5 text-ink-3" strokeWidth={2.25} />
                  {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}
                </span>
              </Section>

              {project.collaborationRoles.length > 0 ? (
                <Section title="Recruiting for">
                  <div className="flex flex-wrap gap-1.5">
                    {project.collaborationRoles.map((r) => (
                      <Badge key={r} tone="info">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section title="Phase">
                <span className="text-[14px] text-ink">{PROJECT_PHASE_LABEL[project.phase]}</span>
              </Section>
            </div>
          </aside>
        </div>

        <MediaHero
          media={project.media}
          title={project.title}
          manageHref={
            isInsider(project) && project.access.isManager
              ? `/projects/${project.slug}/manage`
              : undefined
          }
        />

        <div className="grid gap-10 lg:grid-cols-12">
          <article className="lg:col-span-8">
            <h2 className="mb-4 font-display text-h2 tracking-[-0.01em] text-ink">About</h2>
            <RichTextEditor value={project.description as object} editable={false} />

            {project.techStack.length > 0 ? (
              <section className="mt-10">
                <h2 className="mb-4 font-display text-h2 tracking-[-0.01em] text-ink">
                  Tech stack
                </h2>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((t) => (
                    <Badge key={t} tone="neutral">
                      {t}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside className="lg:col-span-4">
            {insider ? (
              <div className="space-y-6 rounded-lg border border-line bg-surface p-5">
                <Section title="Internal links">
                  {insider.internalLinks ? <InternalLinks links={insider.internalLinks} /> : (
                    <span className="text-[13px] text-ink-3">No links yet.</span>
                  )}
                </Section>

                <TaskListsSidebar projectSlug={project.slug} canManage={project.access.isManager} />

                <Section title={`Members (${insider.members.length})`}>
                  <ul className="space-y-2">
                    {insider.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-2.5">
                        <Avatar src={m.user.avatarUrl} name={m.user.name} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-ink">
                            {m.user.name}
                          </div>
                          <div className="truncate text-[12px] text-ink-3">
                            {m.title ?? m.role.toLowerCase().replace('_', ' ')}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-surface-muted p-5 text-[13px] text-ink-3">
                Internal links and the full member list are visible to team members only.
              </div>
            )}
          </aside>
        </div>
      </Container>

      {canContribute && me ? (
        <ContributeModal
          projectSlug={project.slug}
          projectTitle={project.title}
          collaborationRoles={project.collaborationRoles}
          user={{ name: me.name, email: me.email }}
        />
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InternalLinks({
  links,
}: {
  links: NonNullable<ProjectDetailInsider['internalLinks']>;
}) {
  const items: { key: string; href: string; label: string; icon: React.ReactNode }[] = [];
  if (links.pmTool)
    items.push({
      key: 'pmTool',
      href: links.pmTool,
      label: 'Project board',
      icon: <KanbanSquare className="h-3.5 w-3.5" strokeWidth={2.25} />,
    });
  if (links.repository)
    items.push({
      key: 'repo',
      href: links.repository,
      label: 'Repository',
      icon: <GitBranch className="h-3.5 w-3.5" strokeWidth={2.25} />,
    });
  if (links.staging)
    items.push({
      key: 'staging',
      href: links.staging,
      label: 'Staging',
      icon: <Globe className="h-3.5 w-3.5" strokeWidth={2.25} />,
    });
  if (links.designs)
    items.push({
      key: 'designs',
      href: links.designs,
      label: 'Design files',
      icon: <Figma className="h-3.5 w-3.5" strokeWidth={2.25} />,
    });
  if (items.length === 0)
    return <span className="text-[13px] text-ink-3">No links yet.</span>;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.key}>
          <a
            href={it.href}
            target="_blank"
            rel="noreferrer"
            className="group -my-1 inline-flex items-center gap-2 py-1 text-[13px] text-ink hover:text-brand-blue"
          >
            <span className="text-ink-3 group-hover:text-brand-blue">{it.icon}</span>
            <span className="font-medium">{it.label}</span>
            <ArrowUpRight
              className="h-3 w-3 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2.25}
            />
            <span aria-hidden className="sr-only">
              Opens in new tab
              <ExternalLink className="hidden" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Keep in sync with the docs section on session idle timeout policy

// TODO(ops): confirm typing indicator backpressure behavior on the next staging deploy
