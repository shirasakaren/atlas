import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { DEMO } from '@/lib/demo/config';
import { DemoLogin } from '@/components/demo/demo-login';
import { getStoredSession } from '@/lib/auth-client';
import { sanitizeReturnTo } from '@/lib/auth-redirect';
import { Wordmark } from '@/components/brand/wordmark';
import { PatternCorner } from '@/components/brand/pattern-corner';
import { ShapeSignature } from '@/components/brand/shape-signature';
import { LoginClient } from '@/components/auth/login-client';
import type { PublicConfig } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    reason?: string;
    error?: string;
    error_status?: string;
    error_detail?: string;
  }>;
}

/** User-facing explanations for known error codes. Keep these free of
 *  operator jargon, raw codes live behind the "Technical details"
 *  disclosure instead. */
const ERROR_HINTS: Record<string, string> = {
  session_creation_failed:
    "We couldn't start your session. The sign-in service didn't respond, please try again in a moment.",
  missing_identity_claims:
    "The identity provider didn't return any profile information. Try a different sign-in method.",
  token_exchange_failed:
    'The identity provider rejected the sign-in attempt. Check that the provider is set up correctly, then try again.',
  missing_parameters:
    'The sign-in response was incomplete. Please try signing in again.',
  missing_api_url:
    "The sign-in service isn't configured for this page. Contact your administrator.",
  invalid_session_data:
    "The sign-in response couldn't be read. Please try signing in again.",
  internal_error: 'Something went wrong on our side. Please try again.',
  oauth_failed: 'Social sign-in failed. Please try again.',
};

const FALLBACK_CONFIG: PublicConfig = {
  configured: true,
  site: { name: 'Atlas', description: '' },
  appearance: { defaultTheme: 'atlas', defaultThemeMode: 'system', allowUserThemes: true },
  themes: [],
  registration: {
    enabled: false,
    inviteRequired: true,
    defaultRole: 'member',
    requireEmailVerification: false,
  },
  authMethods: {
    password: { enabled: true, label: 'Email & password' },
    magicLink: { enabled: false, label: 'Magic link' },
    phone: { enabled: false, otpEnabled: false, label: 'Phone' },
    passphrase: { enabled: false, label: 'Passphrase' },
  },
  oauthProviders: [],
  oauthCallbacks: {},
  sso: {
    oidc: { enabled: false, label: 'Single sign-on' },
    saml: { enabled: false, label: 'Company SSO' },
    connections: [],
  },
  modules: { pmo: false, voice: false },
  features: { gifs: false, push: false },
  gifs: { available: false, klipyAppKey: '' },
  legal: { requireConsent: false, terms: false, privacy: false },
};

async function loadPublicConfig(): Promise<PublicConfig> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  try {
    const res = await fetch(`${base}/public-config`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return (await res.json()) as PublicConfig;
  } catch {
    // API down or timed out → fall back to the password-only surface; the
    // API error will surface on submit.
  }
  return FALLBACK_CONFIG;
}

function truncateDetail(detail: string, max = 400): string {
  return detail.length > max ? `${detail.slice(0, max)}…` : detail;
}

export default async function LoginPage({ searchParams }: PageProps) {
  // Static demo build: no backend to ask, one-click persona sign-in instead.
  if (DEMO) {
    return (
      <Suspense fallback={null}>
        <DemoLogin />
      </Suspense>
    );
  }
  const session = getStoredSession();
  const params = await searchParams;
  const config = await loadPublicConfig();

  // If already logged in, redirect to the requested page (or dashboard).
  // NOTE: this server-side branch is currently dead, getStoredSession()
  // is window-gated and always returns null on the server, but the
  // callbackUrl is sanitized anyway so it stays safe if a server-side
  // session source ever lands.
  if (session) {
    redirect(sanitizeReturnTo(params.callbackUrl) ?? '/dashboard');
  }

  const isEmailVerificationNotice = params.error === 'check_your_email';

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-surface px-6">
      <PatternCorner position="top-right" size={3} cellSize={72} />
      <PatternCorner position="bottom-left" size={2} cellSize={56} />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <ShapeSignature size={36} />
          <Wordmark withSignature={false} className="text-[28px]" />
        </div>

        <div className="rounded-xl border border-line bg-surface p-8 shadow-1">
          <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
            Welcome back
          </h1>
          <p className="mt-2 text-body-sm text-ink-2">
            {config.site.description ||
              'Sign in to discover, manage, and contribute to projects.'}
          </p>

          {params.reason === 'session-expired' ? (
            <div className="mt-5 rounded border border-brand-yellow bg-brand-yellow-50 px-4 py-3 text-[14px] text-brand-yellow-ink">
              Your session expired. Sign in again to continue.
            </div>
          ) : null}

          {isEmailVerificationNotice ? (
            <div
              role="status"
              className="mt-5 rounded border border-brand-blue/30 bg-brand-blue-50 px-4 py-3 text-[13px] text-ink"
            >
              <div className="font-medium text-brand-blue">
                Check your email, we sent a verification link
              </div>
              <p className="mt-1 text-ink-2">
                Follow the link to confirm your address, then sign in.
              </p>
            </div>
          ) : null}

          {params.error && !isEmailVerificationNotice ? (
            <div
              role="alert"
              className="mt-5 rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13px] text-ink"
            >
              <div className="font-medium text-brand-red">
                {ERROR_HINTS[params.error] ?? 'Sign-in failed. Please try again.'}
              </div>
              {(params.error_detail || !ERROR_HINTS[params.error]) ? (
                <details className="mt-2">
                  <summary className="-my-1.5 inline-block cursor-pointer py-1.5 text-[12px] font-medium text-ink-3 hover:text-ink">
                    Technical details
                  </summary>
                  {!ERROR_HINTS[params.error] ? (
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-surface/60 p-2 font-mono text-[11px] text-ink-3">
                      error: {params.error}
                      {params.error_status ? ` (${params.error_status})` : null}
                    </pre>
                  ) : null}
                  {params.error_detail ? (
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-surface/60 p-2 font-mono text-[11px] text-ink-3">
                      {truncateDetail(params.error_detail)}
                    </pre>
                  ) : null}
                </details>
              ) : null}
            </div>
          ) : null}

          <LoginClient config={config} callbackUrl={params.callbackUrl} />
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-3">
          {config.site.name} · Self-hosted Atlas
        </p>
      </div>
    </main>
  );
}
