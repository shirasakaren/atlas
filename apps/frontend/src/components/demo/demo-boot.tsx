'use client';

// Side-effect import: installs the in-browser API before anything renders.
import '@/lib/demo/init';
import * as React from 'react';
import { DEMO } from '@/lib/demo/config';
import { DemoChip } from './demo-chip';

/**
 * Once a page reached through the GitHub-Pages 404 bounce has stayed on screen
 * for a moment, forget the bounce marker: a later reload of the same URL is
 * then a normal deep link again (the marker only exists to break an instant
 * 404 loop, where the page never gets to stay up).
 */
function useClearBounceMarker() {
  React.useEffect(() => {
    let since = 0;
    let ticks = 0;
    const id = setInterval(() => {
      ticks++;
      try {
        if (ticks > 60) return clearInterval(id);
        // The marker is written by the root page a moment after boot: keep waiting for it.
        const raw = sessionStorage.getItem('atlas_spa_last');
        if (!raw) return;
        const last = JSON.parse(raw) as { p?: string };
        const here = location.pathname + location.search + location.hash;
        if (last.p !== here) {
          since = 0;
          return;
        }
        since = since || Date.now();
        if (Date.now() - since >= 1200) {
          sessionStorage.removeItem('atlas_spa_last');
          clearInterval(id);
        }
      } catch {
        clearInterval(id);
      }
    }, 400);
    return () => clearInterval(id);
  }, []);
}

export function DemoBoot() {
  useClearBounceMarker();
  if (!DEMO) return null;
  return <DemoChip />;
}
