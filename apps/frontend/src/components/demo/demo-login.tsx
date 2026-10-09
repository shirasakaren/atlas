'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Github, HardDrive, Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { PatternCorner } from '@/components/brand/pattern-corner';
import { ShapeSignature } from '@/components/brand/shape-signature';
import { Wordmark } from '@/components/brand/wordmark';
import { sanitizeReturnTo } from '@/lib/auth-redirect';
import { avatarDataUri } from '@/lib/demo/assets';
import { COMPANY, SOURCE_URL } from '@/lib/demo/config';
import { PERSONA, signInAsPersona } from '@/lib/demo/session';

/** Demo sign-in: one persona, one click. Replaces the credential form. */
export function DemoLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = React.useState(false);

  const go = () => {
    setBusy(true);
    signInAsPersona();
    router.push((sanitizeReturnTo(params.get('callbackUrl')) ?? '/dashboard') as never);
  };

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-surface px-6 py-10">
      <PatternCorner position="top-right" size={3} cellSize={72} />
      <PatternCorner position="bottom-left" size={2} cellSize={56} />

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <ShapeSignature size={36} />
          <Wordmark withSignature={false} className="text-[28px]" />
          <span className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[12px] font-medium text-ink-2">
            Live demo · sample data
          </span>
        </div>

        <div className="rounded-xl border border-line bg-surface p-8 shadow-1">
          <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
            Welcome to the Atlas demo
          </h1>
          <p className="mt-2 text-body-sm text-ink-2">
            A project management office for a fictional company, {COMPANY.name}: 80+ projects,
            thousands of tasks and a very busy chat. Nothing here is real.
          </p>

          {params.get('reason') === 'session-expired' ? (
            <div className="mt-5 rounded border border-brand-yellow bg-brand-yellow-50 px-4 py-3 text-[14px] text-brand-yellow-ink">
              Your demo session was reset. Continue to jump back in.
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-4 rounded-lg border border-line bg-surface-muted p-4">
            <Avatar name={PERSONA.name} src={avatarDataUri(PERSONA.name, PERSONA.id)} size={48} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium text-ink">{PERSONA.name}</div>
              <div className="truncate text-[13px] text-ink-2">{PERSONA.title}</div>
              <div className="truncate font-mono text-[12px] text-ink-3">{PERSONA.email}</div>
            </div>
          </div>

          <Button className="mt-5 w-full" size="lg" onClick={go} loading={busy}>
            Continue as {PERSONA.name.split(' ')[0]}
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Button>

          <ul className="mt-6 space-y-3 text-[13px] text-ink-2">
            <li className="flex gap-3">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" strokeWidth={2.25} />
              <span>
                Maya owns, manages and contributes to dozens of projects, so there is plenty to explore.
              </span>
            </li>
            <li className="flex gap-3">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" strokeWidth={2.25} />
              <span>
                Change anything you like. Edits are saved only in this browser and never affect anyone else.
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" strokeWidth={2.25} />
              <span>The whole app runs client-side: there is no server behind this page.</span>
            </li>
          </ul>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-3">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-brand-blue hover:underline"
          >
            <Github className="h-3.5 w-3.5" strokeWidth={2.25} />
            View the source on GitHub
          </a>
        </p>
      </div>
    </main>
  );
}
