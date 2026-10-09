'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Github, LogOut, RotateCcw, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { clearSession, getStoredSession } from '@/lib/auth-client';
import { COMPANY, ME_ID, SOURCE_URL } from '@/lib/demo/config';
import { signInAsPersona } from '@/lib/demo/session';
import { cn } from '@/lib/utils';

const LS_WELCOMED = 'atlas_demo_welcomed';

/**
 * Floating "Live demo" chip: explains what this is, switches the persona
 * between Admin and Member views, resets the visitor's local edits.
 */
export function DemoChip() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    try {
      setIsAdmin(getStoredSession()?.user.isAdmin ?? true);
      if (!localStorage.getItem(LS_WELCOMED) && getStoredSession()) {
        const t = setTimeout(() => {
          setOpen(true);
          localStorage.setItem(LS_WELCOMED, '1');
        }, 1800);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked */
    }
  }, []);

  async function setRole(admin: boolean) {
    if (admin === isAdmin) return;
    setBusy(true);
    const [{ dbReady }, { users }] = await Promise.all([
      import('@/lib/demo/db'),
      import('@/lib/demo/store'),
    ]);
    await import('@/lib/demo/engine');
    await dbReady();
    users().update(ME_ID, { isAdmin: admin, roles: admin ? ['superadmin'] : ['manager'] });
    const { flushNow } = await import('@/lib/demo/db');
    await flushNow();
    signInAsPersona(admin);
    setIsAdmin(admin);
    qc.clear();
    window.location.assign(admin ? '/dashboard' : '/projects');
  }

  async function reset() {
    if (!window.confirm('Discard every change you made in this demo and start fresh?')) return;
    setBusy(true);
    const { resetDemoData } = await import('@/lib/demo/db');
    await resetDemoData();
  }

  function signOut() {
    clearSession();
    setOpen(false);
    router.push('/login');
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[60]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'pointer-events-auto inline-flex items-center gap-2 rounded-full bg-surface-inverse px-3.5 py-2',
              'text-[12px] font-medium text-white shadow-2 transition-transform duration-120 ease-out-soft hover:-translate-y-px',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
            </span>
            Live demo
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          className="pointer-events-auto w-[min(340px,calc(100vw-2rem))] p-0"
        >
          <div className="border-b border-line p-4">
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <FlaskConical className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
              You&apos;re exploring Atlas
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              Everything is sample data for a fictional company, {COMPANY.name}. You&apos;re signed in
              as <span className="font-medium text-ink">Maya Brennan</span>, a very active program
              manager. Edit anything: changes are saved in this browser only and never affect anyone
              else.
            </p>
          </div>
          <div className="border-b border-line p-4">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">
              View as
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1">
              {(
                [
                  [true, 'Admin', ShieldCheck],
                  [false, 'Member', User],
                ] as const
              ).map(([val, label, Icon]) => (
                <button
                  key={label}
                  type="button"
                  disabled={busy}
                  onClick={() => void setRole(val)}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                    isAdmin === val ? 'bg-surface text-ink shadow-1' : 'text-ink-3 hover:text-ink',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-ink-3">
              Members only see projects they belong to and public ones; admins also get the admin
              panel and godmode.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 p-3">
            <Button size="sm" variant="secondary" onClick={() => void reset()} disabled={busy}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
              Reset data
            </Button>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
              Sign out
            </Button>
            <Button asChild size="sm" variant="ghost" className="ml-auto">
              <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                <Github className="h-3.5 w-3.5" strokeWidth={2.25} />
                Source
              </a>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
