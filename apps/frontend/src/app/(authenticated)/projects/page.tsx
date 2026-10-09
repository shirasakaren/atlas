'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { getStoredSession } from '@/lib/auth-client';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import { useCanCreateProject } from '@/lib/hooks/use-can-create-project';
import type { CollaborationRole, Paginated, ProjectCard, Tag } from '@/lib/types';
import { Container } from '@/components/layout/container';
import { ProjectCard as ProjectCardView } from '@/components/projects/project-card';
import { GlobalSearchBar } from '@/components/projects/search-bar';
import { FilterPanel } from '@/components/projects/filter-panel';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';

// Dashboard "View all" links arrive as ?row=<key>; map each row key onto
// the browse filters this page already supports, keeping the same URL
// conventions as the filter panel. Rows with no equivalent get no link
// on the dashboard side, so anything unlisted here is ignored.
const ROW_FILTERS: Record<string, { phase?: string[] }> = {
  shipped: { phase: ['SHIPPED'] },
};

export default function ProjectsBrowsePage() {
  usePageTitle('Discover');

  const searchParams = useSearchParams();
  const { canCreate: canCreateProject } = useCanCreateProject(getStoredSession()?.user);

  const q = searchParams.get('q') || undefined;
  const row = searchParams.get('row');
  const rowFilters = row ? ROW_FILTERS[row] : undefined;
  const phase = rowFilters?.phase ?? (searchParams.get('phase') ? searchParams.get('phase')!.split(',') : undefined);
  const tagIds = searchParams.get('tagIds') ? searchParams.get('tagIds')!.split(',') : undefined;
  const recruitingFor = searchParams.get('recruitingFor') || undefined;
  const bookmarkedOnly = searchParams.get('bookmarkedOnly') === 'true';
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const sort = searchParams.get('sort') || undefined;

  const projects = useQuery({
    queryKey: queryKeys.projects({ q, phase, tagIds, recruitingFor, bookmarkedOnly, page, sort }),
    queryFn: () =>
      api<Paginated<ProjectCard>>(
        apiPaths.projects({
          q,
          phase,
          tagIds,
          recruitingFor,
          bookmarkedOnly,
          page,
          sort,
        }),
      ),
  });
  const grouped = useQuery({
    queryKey: queryKeys.tagsGrouped,
    queryFn: () => api<{ category: string; items: Tag[] }[]>(apiPaths.tagsGrouped()),
  });
  const roles = useQuery({
    queryKey: queryKeys.collaborationRoles,
    queryFn: () => api<CollaborationRole[]>(apiPaths.collaborationRoles()),
  });

  if (projects.isLoading || grouped.isLoading || roles.isLoading || !grouped.data || !roles.data) {
    return (
      <Container size="2xl" className="space-y-8 py-12">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  if (projects.isError || grouped.isError || roles.isError || !projects.data) {
    return (
      <Container size="2xl" className="space-y-8 py-12">
        <ErrorState
          page
          title="Couldn't load projects"
          message="Something went wrong while fetching projects. Check your connection and try again."
          onRetry={() => {
            projects.refetch();
            grouped.refetch();
            roles.refetch();
          }}
        />
      </Container>
    );
  }

  const totalPages = projects.data.meta.totalPages;

  return (
    <Container size="2xl" className="space-y-8 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
          Discover
        </h1>
        <p className="max-w-prose text-body text-ink-2">
          {q ? <>Showing results for <span className="font-medium text-ink">&ldquo;{q}&rdquo;</span>.</> : (process.env.NEXT_PUBLIC_DEMO === 'true' ? 'Browse every project across Halcyon Global. Filter by phase, tags, or open roles.' : 'Find what Ren is working on. Filter by phase, tags, or open roles.')}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <GlobalSearchBar />
        </div>
        <FilterPanel groupedTags={grouped.data} collaborationRoles={roles.data} />
      </div>

      {projects.data.items.length === 0 ? (
        <EmptyState
          title="No projects match those filters."
          description="Try removing a filter, or contribute to a project once new ones open up."
          action={
            <div className="flex gap-3">
              <Button asChild variant="secondary">
                <Link href={'/projects'}>Clear filters</Link>
              </Button>
              {canCreateProject ? (
                <Button asChild>
                  <Link href={'/projects/new'}>
                    <Plus className="h-4 w-4" strokeWidth={2.25} />
                    Start a project
                  </Link>
                </Button>
              ) : null}
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 xl:grid-cols-4">
            {projects.data.items.map((p) => (
              <ProjectCardView key={p.id} project={p} static />
            ))}
          </div>

          {totalPages > 1 ? (
            <Pagination page={page} totalPages={totalPages} searchParams={searchParams} />
          ) : null}
        </>
      )}
    </Container>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const linkFor = (target: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(target));
    return `/projects?${next.toString()}`;
  };

  return (
    <nav className="flex items-center justify-between border-t border-line pt-6" aria-label="Pagination">
      <span className="text-[13px] text-ink-3">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button asChild variant="secondary" size="sm" disabled={page <= 1}>
          <Link href={linkFor(Math.max(1, page - 1))} aria-disabled={page <= 1}>
            Previous
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm" disabled={page >= totalPages}>
          <Link href={linkFor(Math.min(totalPages, page + 1))} aria-disabled={page >= totalPages}>
            Next
          </Link>
        </Button>
      </div>
    </nav>
  );
}

// See the incident notes for S3 presign TTL tuning before changing defaults
