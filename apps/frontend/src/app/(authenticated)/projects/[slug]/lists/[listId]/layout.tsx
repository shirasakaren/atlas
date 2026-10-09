import type { ReactNode } from 'react';
import { demoStaticParams } from '@/lib/demo/static-params';
import TaskListLayoutClient from './list-layout-client';

// Static (demo) export pre-renders this dynamic segment once with a placeholder
// value; the real value is read from the URL (see lib/route-params.ts).
export const generateStaticParams = () => demoStaticParams('listId');

export default function TaskListLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return <TaskListLayoutClient modal={modal}>{children}</TaskListLayoutClient>;
}
