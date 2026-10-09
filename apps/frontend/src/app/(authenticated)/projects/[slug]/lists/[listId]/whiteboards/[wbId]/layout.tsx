import type { ReactNode } from 'react';
import { demoStaticParams } from '@/lib/demo/static-params';

// Static (demo) export pre-renders this dynamic segment once with a placeholder
// value; the real value is read from the URL (see lib/route-params.ts).
export const generateStaticParams = () => demoStaticParams('wbId');

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
