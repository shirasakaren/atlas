'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getStoredSession } from '@/lib/auth-client';
import { useAuthCallback } from '@/lib/hooks/use-auth-callback';
import { DEMO } from '@/lib/demo/config';

const PARKED_KEY = 'atlas_spa_path';
const LAST_KEY = 'atlas_spa_last';

function takeParkedPath(): string | null {
  try {
    const p = sessionStorage.getItem(PARKED_KEY);
    if (!p) return null;
    sessionStorage.removeItem(PARKED_KEY);
    sessionStorage.setItem(LAST_KEY, JSON.stringify({ p, t: Date.now() }));
    return p.startsWith('/') && !p.startsWith('//') ? p : null;
  } catch {
    return null;
  }
}

function RootPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasSessionParam = searchParams.get('session') != null;

  // If we arrived from the OAuth callback, useAuthCallback will parse the
  // `?session=` blob, write it to localStorage, and push to the destination.
  // We must NOT race it with our own redirect, at render time the session
  // hasn't been stored yet, so getStoredSession() would return null and bounce
  // the user to /login, forcing a second sign-in click.
  useAuthCallback();

  useEffect(() => {
    if (hasSessionParam) return;
    const session = getStoredSession();
    // Static demo: GitHub Pages serves 404.html for client-created paths (new
    // projects, tasks…); it parks the path here and we route there client-side.
    if (DEMO) {
      const parked = takeParkedPath();
      if (parked && session) {
        router.replace(parked as never);
        return;
      }
    }
    router.replace(session ? '/dashboard' : '/login');
  }, [hasSessionParam, router]);

  return null;
}

export default function RootPage() {
  return (
    <Suspense fallback={null}>
      <RootPageContent />
    </Suspense>
  );
}

// Fallback path for gallery fractional reordering when the primary is unavailable

// Why: Yjs snapshot debounce window, see the ADR in docs/adr/

// TODO(ops): confirm Gantt timeline timezone offsets behavior on the next staging deploy
