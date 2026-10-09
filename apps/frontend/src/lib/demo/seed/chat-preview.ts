/**
 * Canned Open Graph previews (the real backend scrapes the page; the demo has
 * no network). Used by the link-preview endpoint and to decorate seeded
 * messages that contain links. Pure; no browser globals.
 */
import { posterDataUri } from '../assets';
import type { ChatLinkPreview } from '@/lib/types';

const imgCache = new Map<string, string>();
const poster = (label: string, seed: string) => {
  const k = `${label}|${seed}`;
  let v = imgCache.get(k);
  if (!v) imgCache.set(k, (v = posterDataUri(label, seed, 480, 270)));
  return v;
};

const humanize = (s: string) =>
  s
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/%20/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());

interface Site {
  name: string;
  desc: (title: string, path: string[]) => string;
  title?: (title: string, path: string[]) => string;
}

const SITES: Record<string, Site> = {
  'wiki.halcyon.example': { name: 'Halcyon Wiki', desc: () => 'Halcyon Global internal documentation. Last edited this week.' },
  'figma.halcyon.example': { name: 'Figma', desc: () => 'Design file · Halcyon Global workspace', title: (t) => `${t} – Figma` },
  'git.halcyon.example': { name: 'Halcyon Git', desc: (_t, p) => (p.includes('pull') ? 'Pull request · checks passing, 2 approvals' : 'Repository · Halcyon Global') },
  'grafana.halcyon.example': { name: 'Grafana', desc: () => 'Dashboard · refreshes every 30s', title: (t) => `${t} · Grafana` },
  'tracker.halcyon.example': { name: 'Halcyon Tracker', desc: () => 'Work item in the project tracker.' },
  'github.com': { name: 'GitHub', desc: () => 'Contribute to this project on GitHub.' },
  'stackoverflow.com': { name: 'Stack Overflow', desc: () => 'Q&A for professional and enthusiast programmers.' },
  'en.wikipedia.org': { name: 'Wikipedia', desc: () => 'Wikipedia, the free encyclopedia.', title: (t) => `${t} - Wikipedia` },
  'docs.snowflake.com': { name: 'Snowflake Documentation', desc: () => 'Reference documentation.' },
  'docs.python.org': { name: 'Python documentation', desc: () => 'Official Python documentation.' },
  'developer.mozilla.org': { name: 'MDN Web Docs', desc: () => 'Resources for developers, by developers.' },
  'owasp.org': { name: 'OWASP Foundation', desc: () => 'Open source security guidance.' },
};

/** Preview for a URL, or null when it is not a valid http(s) URL. */
export function previewFor(rawUrl: string): ChatLinkPreview | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const segs = u.pathname.split('/').filter(Boolean);
  const meaningful = [...segs].reverse().find((s) => !/^\d+$/.test(s) && s !== 'pull' && s !== 'pages' && s !== 'd' && s !== 'file');
  const base = meaningful ? humanize(decodeURIComponent(meaningful)) : humanize(host.split('.')[0] ?? host);
  const site = SITES[host] ?? SITES[host.split('.').slice(-3).join('.')] ?? null;
  const siteName = site?.name ?? humanize(host.split('.').slice(-2)[0] ?? host);
  const title = site?.title ? site.title(base, segs) : base || siteName;
  return {
    url: rawUrl,
    kind: 'link',
    title,
    description: site ? site.desc(base, segs) : `${siteName} · ${host}`,
    imageUrl: poster(siteName, host),
    siteName,
    embedHtml: null,
    cached: false,
  };
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/;

export function firstUrl(text: string): string | null {
  const m = URL_RE.exec(text);
  return m ? m[0].replace(/[.,;:!?]+$/, '') : null;
}
