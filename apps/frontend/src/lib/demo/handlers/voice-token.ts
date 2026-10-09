/** Shared by the join handlers and decoded by the LiveKit mock. */
export const LIVEKIT_DEMO_URL = 'wss://livekit.demo.invalid';

/** Opaque-looking token the LiveKit mock decodes (identity, name, avatar, role, channel). */
export function mintDemoToken(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/=+$/, '');
  return `demo.${b64}.signature`;
}

export function decodeDemoToken(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1] ?? '';
    const pad = part + '='.repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(pad))));
  } catch {
    return null;
  }
}
