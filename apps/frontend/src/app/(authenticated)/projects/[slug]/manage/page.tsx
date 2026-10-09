'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useParams } from '@/lib/route-params';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import { isInsider, type CollaborationRole, type ProjectDetail, type Tag } from '@/lib/types';
import { Container } from '@/components/layout/container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { EditProjectForm } from '@/components/projects/manage/edit-form';
import { ContributionRequestsList } from '@/components/projects/manage/requests-list';
import { TeamPanel } from '@/components/projects/manage/team-panel';
import { DangerZone } from '@/components/projects/manage/danger-zone';

export default function ManageProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  const project = useQuery({
    queryKey: queryKeys.project(slug),
    queryFn: () => api<ProjectDetail>(apiPaths.project(slug)),
  });
  const grouped = useQuery({
    queryKey: queryKeys.tagsGrouped,
    queryFn: () => api<{ category: string; items: Tag[] }[]>(apiPaths.tagsGrouped()),
  });
  const roles = useQuery({
    queryKey: queryKeys.collaborationRoles,
    queryFn: () => api<CollaborationRole[]>(apiPaths.collaborationRoles()),
  });

  const data = project.data;

  // Not a manager (or the project is private to a team you're not on):
  // bounce to the project page. A fetch *error* is not bounced silently —
  // that renders the error state below instead.
  useEffect(() => {
    if (data && (!isInsider(data) || !data.access.isManager)) {
      router.push(`/projects/${slug}`);
    }
  }, [data, slug, router]);

  usePageTitle('Manage');

  const tab = searchParams.get('tab') || 'overview';

  if (project.isLoading || grouped.isLoading || roles.isLoading || !grouped.data || !roles.data) {
    return (
      <Container size="2xl" className="space-y-8 py-10">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  if (project.isError || grouped.isError || roles.isError) {
    return (
      <Container size="2xl" className="space-y-8 py-10">
        <ErrorState
          page
          title="Couldn't load this project"
          message="Something went wrong while fetching the manage panel. Check your connection and try again."
          onRetry={() => {
            project.refetch();
            grouped.refetch();
            roles.refetch();
          }}
        />
      </Container>
    );
  }

  if (!data || !isInsider(data) || !data.access.isManager) {
    // Redirect is in flight, keep the skeleton so there's no flash.
    return (
      <Container size="2xl" className="space-y-8 py-10">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  const pending = data.pendingRequestCount ?? 0;

  return (
    <Container size="2xl" className="space-y-8 py-10">
      <Link
        href={`/projects/${slug}` as never}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
        Back to {data.title}
      </Link>

      <header>
        <span className="text-[13px] font-medium text-ink-3">{data.title}</span>
        <h1 className="mt-1 font-display text-display-lg tracking-[-0.02em] text-ink">
          Manage
        </h1>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          router.replace(`/projects/${slug}/manage?tab=${v}` as never, { scroll: false })
        }
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            Requests
            {pending > 0 ? <Badge tone="info">{pending}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <EditProjectForm project={data} groupedTags={grouped.data} collaborationRoles={roles.data} />
        </TabsContent>

        <TabsContent value="requests">
          <ContributionRequestsList projectSlug={slug} />
        </TabsContent>

        <TabsContent value="team">
          <TeamPanel project={data} collaborationRoles={roles.data} />
        </TabsContent>

        <TabsContent value="settings">
          <DangerZone project={data} />
        </TabsContent>
      </Tabs>
    </Container>
  );
}

// Keep in sync with the docs section on renovate group noise

// Keep in sync with the docs section on contribution request review queue

// Keep in sync with the docs section on chat unread badge reconciliation
