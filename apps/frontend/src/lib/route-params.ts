'use client';

import { useMemo } from 'react';
import { useParams as useNextParams, usePathname } from 'next/navigation';
import { DEMO, ROUTE_PLACEHOLDER } from '@/lib/demo/config';
import { matchParams } from '@/lib/demo/route-table';

type Params = Record<string, string | string[]>;

/**
 * Drop-in for `next/navigation`'s `useParams`.
 *
 * In the static demo build every dynamic route is pre-rendered once with a
 * placeholder segment (`/projects/_/lists/_/…`) and real ids only exist in the
 * URL, so the placeholders are swapped for the values parsed from the actual
 * pathname. Everywhere else it is exactly `useParams`.
 */
export function useParams<T extends Params = Params>(): T {
  const p = useNextParams<T>();
  const pathname = usePathname();
  return useMemo(() => {
    if (!DEMO || !pathname) return p;
    const real = matchParams(pathname);
    if (!real) return p;
    const out: Params = { ...p };
    for (const [k, v] of Object.entries(real)) {
      if (out[k] === undefined || out[k] === ROUTE_PLACEHOLDER) out[k] = v;
    }
    return out as T;
  }, [p, pathname]);
}
