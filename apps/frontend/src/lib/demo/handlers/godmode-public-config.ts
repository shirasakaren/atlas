/**
 * `GET /public-config` derived from the godmode settings table, so changing a
 * setting in godmode (site name, theme default, sign-in methods, modules...)
 * is reflected on the login page and across the app, like the real backend.
 *
 * The app domain owns the `/public-config` route; it can call
 * `godmodePublicConfig()` instead of its hard-coded object (see the report).
 * Not registered as a route here on purpose (no duplicate registration).
 */
import type { PublicConfig } from '@/lib/types';
import { getSetting, settingDef } from './godmode-settings';
import { listSsoConnections, passphraseTbl } from './godmode-sso';

const OAUTH_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  gitlab: 'GitLab',
  apple: 'Apple',
  x: 'X',
  facebook: 'Facebook',
  discord: 'Discord',
  azure: 'Microsoft',
  keycloak: 'Keycloak',
};

export function godmodePublicConfig(): PublicConfig {
  const g = <T = unknown>(k: string) => getSetting<T>(k);
  const base = String(g('system.instanceUrl') || 'https://atlas.halcyon.example').replace(/\/+$/, '');
  const conns = listSsoConnections().filter((c) => c.enabled);
  const passphraseOn =
    g<boolean>('auth.passphrase.enabled') === true || passphraseTbl().all().some((c) => c.enabled);
  return {
    configured: g<boolean>('system.configured') === true,
    site: { name: String(g('site.name') || 'Atlas'), description: String(g('site.description') || '') },
    appearance: {
      defaultTheme: String(g('appearance.defaultTheme') || 'atlas'),
      defaultThemeMode: String(g('appearance.defaultThemeMode') || 'system'),
      allowUserThemes: g<boolean>('appearance.allowUserThemes') !== false,
    },
    themes: settingDef('appearance.defaultTheme')?.options ?? [],
    registration: {
      enabled: g<boolean>('registration.enabled') === true,
      inviteRequired: g<boolean>('registration.inviteRequired') === true,
      defaultRole: String(g('registration.defaultRole') || 'member'),
      requireEmailVerification: g<boolean>('registration.requireEmailVerification') === true,
    },
    authMethods: {
      password: { enabled: g<boolean>('auth.emailPassword.enabled') !== false, label: 'Email & password' },
      magicLink: { enabled: g<boolean>('auth.magicLink.enabled') === true, label: 'Magic link' },
      phone: {
        enabled: g<boolean>('auth.phone.enabled') === true,
        otpEnabled: g<boolean>('auth.phone.otpEnabled') !== false,
        label: 'Phone',
      },
      passphrase: { enabled: passphraseOn, label: 'Passphrase' },
    },
    oauthProviders: Object.entries(OAUTH_LABELS)
      .filter(([id]) => g<boolean>(`auth.oauth.${id}.enabled`) === true)
      .map(([id, label]) => ({ id, label })),
    oauthCallbacks: Object.fromEntries(
      Object.keys(OAUTH_LABELS).map((id) => [id, `${base}/api/v1/auth/oauth/${id}/callback`]),
    ),
    sso: {
      oidc: { enabled: g<boolean>('sso.oidc.enabled') === true, label: String(g('sso.oidc.buttonLabel') || 'Single sign-on') },
      saml: { enabled: g<boolean>('sso.saml.enabled') === true, label: String(g('sso.saml.buttonLabel') || 'Company SSO') },
      connections: conns.map((c) => ({ id: c.id, name: c.name, type: c.type, domains: c.domains })),
    },
    modules: { pmo: g<boolean>('modules.pmo.enabled') === true, voice: g<boolean>('modules.voice.enabled') === true },
    features: { gifs: g<boolean>('integrations.gifs.enabled') === true, push: g<boolean>('integrations.push.enabled') === true },
    gifs: {
      available: g<boolean>('integrations.gifs.enabled') === true && !!g('integrations.gifs.klipyAppKey'),
      klipyAppKey: String(g('integrations.gifs.klipyAppKey') || ''),
    },
    legal: {
      requireConsent: g<boolean>('legal.requireConsent') === true,
      terms: String(g('legal.termsText') || '').trim().length > 0,
      privacy: String(g('legal.privacyText') || '').trim().length > 0,
    },
  };
}
