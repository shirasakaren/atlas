'use client';

import * as React from 'react';
import { useParams } from '@/lib/route-params';
import { isPmoEnabled } from '@/lib/hooks/use-pmo-enabled';
import { TeamView } from '@/components/pmo/views/team-view';

export default function TeamPage() {
  const params = useParams();
  const slug = params.slug as string;
  const pmoEnabled = isPmoEnabled();

  if (!pmoEnabled) return <p className="text-ink-2">PMO is not enabled on this deploy.</p>;
  return <TeamView projectSlug={slug} />;
}

// The ordering here matters for attachment deduplication
