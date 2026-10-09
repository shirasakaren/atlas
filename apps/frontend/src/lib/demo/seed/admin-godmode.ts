/**
 * Godmode seed (order 81): makes the instance look configured and lived-in:
 * identity, sign-in methods, providers, modules, SSO connections, passphrase
 * credentials, and one completed storage migration in the history.
 */
import { registerSeeder } from '../db';
import { agoIso, DAY, HOUR } from '../clock';
import { settingsTbl, settingDef, type SettingRow } from '../handlers/godmode-settings';
import { ssoTbl, passphraseTbl } from '../handlers/godmode-sso';
import { migrationsTbl } from '../handlers/godmode-storage';
import { createRng } from '../prng';

const SITE_DESCRIPTION =
  "Halcyon Global's project & program office: every initiative, task, decision and conversation in one place.";

registerSeeder({
  name: 'admin-godmode',
  order: 81,
  run({ now }) {
    const vapid = fakeVapidKeysSeeded();
    const iso = new Date(now).toISOString().slice(0, 10);
    const overrides: Record<string, unknown> = {
      'system.configured': true,
      'system.instanceUrl': 'https://atlas.halcyon.example',
      'site.name': 'Atlas',
      'site.description': SITE_DESCRIPTION,
      'appearance.defaultTheme': 'atlas',
      'appearance.defaultThemeMode': 'system',
      'appearance.allowUserThemes': true,
      'registration.enabled': true,
      'registration.inviteRequired': true,
      'registration.requireEmailVerification': true,
      'registration.defaultRole': 'member',
      'registration.autoVerifyNewUsers': false,
      'auth.emailPassword.enabled': true,
      'auth.magicLink.enabled': true,
      'auth.phone.enabled': false,
      'auth.passphrase.enabled': false,
      'auth.sessionDurationMinutes': 720,
      'auth.forcePasswordChangeOnProvision': true,
      'auth.passwordMinLength': 12,
      'email.provider': 'smtp',
      'email.smtp.host': 'smtp.halcyon.example',
      'email.smtp.port': 587,
      'email.smtp.user': 'atlas-mailer',
      'email.smtp.password': 'demo-not-a-real-secret',
      'email.smtp.secure': false,
      'email.fromAddress': 'atlas@halcyon.example',
      'email.fromName': 'Halcyon Atlas',
      'sms.provider': 'twilio',
      'sms.twilio.accountSid': 'AC0000000000000000000000000000demo',
      'sms.twilio.authToken': 'demo-not-a-real-secret',
      'sms.twilio.from': '+14165550142',
      'auth.oauth.google.enabled': true,
      'auth.oauth.google.clientId': '734918265031-halcyonatlas.apps.googleusercontent.com',
      'auth.oauth.google.clientSecret': 'demo-not-a-real-secret',
      'auth.oauth.azure.enabled': true,
      'auth.oauth.azure.clientId': '5d3c2b1a-9f48-4e7b-8c21-halcyon-atlas',
      'auth.oauth.azure.clientSecret': 'demo-not-a-real-secret',
      'auth.oauth.azure.tenant': 'halcyon-global.onmicrosoft.com',
      'storage.provider': 's3',
      'storage.s3.region': 'ca-central-1',
      'storage.s3.bucket': 'halcyon-atlas-uploads',
      'storage.s3.accessKeyId': 'AKIAIOSFODNN7EXAMPLE',
      'storage.s3.secretAccessKey': 'demo-not-a-real-secret',
      'storage.s3.publicBaseUrl': 'https://cdn.halcyon.example',
      'integrations.n8n.enabled': true,
      'integrations.n8n.baseUrl': 'https://automation.halcyon.example',
      'integrations.n8n.webhookPath': '/webhook/atlas',
      'integrations.n8n.secret': 'demo-not-a-real-secret',
      'integrations.gifs.enabled': true,
      'integrations.gifs.klipyAppKey': 'demo-klipy-app-key',
      'integrations.push.enabled': true,
      'integrations.push.vapidPublicKey': vapid.publicKey,
      'integrations.push.vapidPrivateKey': vapid.privateKey,
      'integrations.push.vapidSubject': 'mailto:atlas-admin@halcyon.example',
      'modules.pmo.enabled': true,
      'modules.voice.enabled': true,
      'legal.requireConsent': false,
      'godmode.sessionTtlMinutes': 720,
      'godmode.totp.enabled': false,
    };

    const rows: SettingRow[] = [];
    for (const [key, value] of Object.entries(overrides)) {
      rows.push({ id: key, value, updatedAt: agoIso(35 * DAY) });
    }
    // Legal texts: bundled templates with their placeholders filled in, as the backend does on first boot.
    for (const key of ['legal.termsText', 'legal.privacyText']) {
      const tpl = String(settingDef(key)?.defaultValue ?? '');
      rows.push({
        id: key,
        value: tpl.replace(/\{\{SITE_NAME\}\}/g, 'Atlas').replace(/\{\{DATE\}\}/g, iso),
        updatedAt: agoIso(90 * DAY),
      });
    }
    settingsTbl().insertMany(rows);

    ssoTbl().insertMany([
      {
        id: 'sso_00001',
        name: 'Halcyon Entra ID',
        type: 'oidc',
        enabled: true,
        domains: ['halcyon.example', 'halcyonglobal.example'],
        config: {
          issuer: 'https://login.microsoftonline.com/0b1f6c2e-4d37-4a79-9c8d-2f61a5e7b3d4/v2.0',
          clientId: '5d3c2b1a-9f48-4e7b-8c21-halcyon-sso',
          clientSecret: 'demo-not-a-real-secret',
        },
        createdAt: agoIso(210 * DAY),
        updatedAt: agoIso(48 * DAY),
      },
      {
        id: 'sso_00002',
        name: 'Contractors (Okta)',
        type: 'saml',
        enabled: false,
        domains: ['contractors.halcyon.example'],
        config: {
          entryPoint: 'https://halcyon-contractors.okta.example/app/atlas/sso/saml',
          spIssuer: 'https://atlas.halcyon.example/saml/metadata',
          cert: '-----BEGIN CERTIFICATE-----\nMIIDemoCertificateForThePortfolioDemoOnly\n-----END CERTIFICATE-----',
        },
        createdAt: agoIso(64 * DAY),
        updatedAt: agoIso(64 * DAY),
      },
    ]);

    passphraseTbl().insertMany([
      {
        id: 'pass_00001',
        name: 'Lobby kiosk (read-only)',
        roleCode: 'visitor',
        enabled: true,
        lastUsedAt: agoIso(3 * HOUR),
        passphraseLength: 18,
        createdAt: agoIso(160 * DAY),
        updatedAt: agoIso(160 * DAY),
      },
      {
        id: 'pass_00002',
        name: 'Quarterly town hall guests',
        roleCode: 'member',
        enabled: false,
        lastUsedAt: agoIso(38 * DAY),
        passphraseLength: 14,
        createdAt: agoIso(95 * DAY),
        updatedAt: agoIso(37 * DAY),
      },
    ]);

    migrationsTbl().insert({
      id: 'mig_00001',
      fromProvider: 'local',
      toProvider: 's3',
      status: 'COMPLETED',
      objectCount: 1284,
      transferredCount: 1284,
      totalBytes: 3_479_000_000,
      transferredBytes: 3_479_000_000,
      error: null,
      createdAt: agoIso(61 * DAY),
      updatedAt: agoIso(61 * DAY - 14 * 60_000),
      finishedAt: agoIso(61 * DAY - 14 * 60_000),
    });
  },
});

/** Deterministic fake keys so the seeded settings are identical on every load. */
function fakeVapidKeysSeeded(): { publicKey: string; privateKey: string } {
  const rng = createRng('godmode-vapid');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const pick = (n: number) => Array.from({ length: n }, () => alphabet[rng.int(0, 63)]).join('');
  return { publicKey: 'B' + pick(86), privateKey: pick(43) };
}
