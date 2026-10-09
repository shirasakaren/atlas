'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { godmodeFetch, godmodePaths, storeGodmodeToken } from '@/lib/godmode/client';
import { usePageTitle } from '@/lib/page-title';
import { DEMO } from '@/lib/demo/config';

interface UnlockResult {
  token: string;
  configured: boolean;
}

export function UnlockForm({ onUnlocked }: { onUnlocked: (token: string) => void }) {
  usePageTitle('Godmode');
  const [passphrase, setPassphrase] = useState('');
  const [totp, setTotp] = useState('');
  const [factors, setFactors] = useState<{ totpEnabled: boolean; passkeyEnabled: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    godmodeFetch<{ totpEnabled: boolean; passkeyEnabled: boolean }>(
      godmodePaths.unlockFactors(),
    )
      .then(setFactors)
      .catch(() => setFactors({ totpEnabled: false, passkeyEnabled: false }));
  }, []);

  const finishUnlock = useCallback(
    (result: UnlockResult) => {
      storeGodmodeToken(result.token);
      onUnlocked(result.token);
    },
    [onUnlocked],
  );

  const submitWith = useCallback(
    async (extra?: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const result = await godmodeFetch<UnlockResult>(godmodePaths.unlock(), {
          method: 'POST',
          body: JSON.stringify({ passphrase, ...extra }),
        });
        finishUnlock(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unlock failed.');
        setBusy(false);
      }
    },
    [passphrase, finishUnlock],
  );

  const submitPasskey = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { challenge, options } = await godmodeFetch<{
        challenge: string;
        options: Record<string, unknown>;
      }>(godmodePaths.passkeyAuthenticateOptions(), { method: 'POST' });
      const assertion = await startAuthentication({ optionsJSON: options as never });
      await submitWith({
        passkey: { challenge, response: assertion },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey verification failed.');
      setBusy(false);
    }
  }, [submitWith]);

  return (
    <div className="rounded-xl border border-line bg-surface p-8 shadow-1">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
        <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
          Unlock godmode
        </h1>
      </div>
      <p className="mt-2 text-body-sm text-ink-2">
        Enter the passphrase from <span className="font-mono text-[13px]">.env</span>{' '}
        (<span className="font-mono text-[13px]">GODMODE_PASSPHRASE</span>). This is the
        superadmin control plane, everything on the instance can be changed from here.
      </p>

      {DEMO ? (
        <p
          role="note"
          className="mt-4 rounded border border-brand-blue/30 bg-brand-blue-50 px-4 py-2.5 text-[13px] text-ink"
        >
          Demo: any passphrase works. Nothing you change here leaves your browser.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gm-passphrase">Passphrase</Label>
          <Input
            id="gm-passphrase"
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && passphrase && !busy) void submitWith();
            }}
            placeholder="••••••••••••••••"
          />
        </div>

        {factors?.totpEnabled ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gm-totp">TOTP code</Label>
            <Input
              id="gm-totp"
              inputMode="numeric"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && passphrase && !busy) {
                  void submitWith(totp ? { totp } : {});
                }
              }}
              placeholder="6-digit code"
            />
          </div>
        ) : null}

        {error ? (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13px] text-ink"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => void submitWith(totp ? { totp } : {})}
            disabled={!passphrase || busy}
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            Unlock
          </Button>
          {factors?.passkeyEnabled ? (
            <Button variant="secondary" onClick={() => void submitPasskey()} disabled={busy}>
              <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
              Use security key
            </Button>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-[13px] text-ink-3">
        Where is the passphrase? It lives in the deploy host&apos;s{' '}
        <span className="font-mono text-[12px]">.env</span> file. Restart the backend after
        changing it.
      </p>
    </div>
  );
}
