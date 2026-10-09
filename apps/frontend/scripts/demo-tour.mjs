#!/usr/bin/env node
/**
 * Visual + error tour of the built demo (dist-demo): visits the major screens,
 * records page errors / console errors / unhandled mock-API routes and saves
 * screenshots.
 *
 *   node scripts/demo-tour.mjs [--shots dir] [--base url] [--only substring] [--theme dark]
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const shots = arg('--shots', '');
const only = arg('--only', '');
let base = arg('--base', '');
if (shots) mkdirSync(shots, { recursive: true });

let server;
if (!base) {
  base = 'http://localhost:4173';
  server = spawn(process.execPath, [join(here, 'serve-demo.mjs'), '4173'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
}
const API = 'https://demo.atlas.invalid/api/v1';

const browser = await chromium.launch({ args: process.env.PW_ARGS ? process.env.PW_ARGS.split('|') : [] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: arg('--theme', 'light'),
});
const page = await ctx.newPage();
let current = 'boot';
const problems = [];
const unhandled = new Set();
page.on('pageerror', (e) => problems.push(`[${current}] pageerror: ${e.message.slice(0, 300)}`));
page.on('console', (m) => {
  const t = m.text();
  if (t.includes('[demo] no handler')) unhandled.add(t.replace('[demo] no handler for ', ''));
  else if (t.includes('[demo] handler crashed')) problems.push(`[${current}] ${t.slice(0, 300)}`);
  else if (m.type() === 'error' && !t.includes('Failed to load resource') && !t.includes('favicon'))
    problems.push(`[${current}] console.error: ${t.slice(0, 300)}`);
});

async function api(path) {
  return page.evaluate(
    async ([base, p]) => {
      const s = JSON.parse(localStorage.getItem('atlas_session') || 'null');
      const r = await fetch(base + p, { headers: { authorization: `Bearer ${s?.sessionId}` } });
      return r.json();
    },
    [API, path],
  );
}

let n = 0;
async function visit(name, url, settle = 2500) {
  if (only && !name.includes(only)) return;
  current = name;
  const t0 = Date.now();
  await page.goto(base + url, { waitUntil: 'load' });
  await page.waitForTimeout(settle);
  const title = await page.title();
  const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 140);
  console.log(`${String(++n).padStart(2, '0')} ${name.padEnd(22)} ${(Date.now() - t0 + 'ms').padStart(7)}  ${url}  « ${text} »`);
  if (shots) await page.screenshot({ path: join(shots, `${String(n).padStart(2, '0')}-${name}.png`) });
}

await visit('login-fresh', '/login', 1500);
await visit('dashboard', '/dashboard', 3500);

const projects = await api('/projects?pageSize=100');
const slug = (projects.items ?? []).find((p) => p.slug === 'customer-portal-redesign')?.slug ?? projects.items?.[0]?.slug;
const lists = await api(`/projects/${slug}/task-lists`);
const listId = lists?.[0]?.id;
const tasks = listId ? await api(`/projects/${slug}/task-lists/${listId}/tasks`) : [];
const taskKey = (tasks.items ?? tasks)?.[0]?.key;
const chatOverview = await api('/chat/me/projects');
const projChan = chatOverview?.projects?.find((p) => p.slug === slug)?.channels?.[0]?.id;
const globalChan = chatOverview?.workspace?.channels?.[0]?.id;
const notes = listId ? await api(`/projects/${slug}/notes`) : [];
const wbs = listId ? await api(`/projects/${slug}/whiteboards`) : [];
console.log({ slug, listId, taskKey, projChan, globalChan, tasks: (tasks.items ?? tasks)?.length });

await visit('for-me', '/for-me');
await visit('projects', '/projects', 3000);
await visit('project', `/projects/${slug}`, 3500);
await visit('project-manage', `/projects/${slug}/manage`);
await visit('list-overview', `/projects/${slug}/lists/${listId}`, 3000);
await visit('list-list', `/projects/${slug}/lists/${listId}/list`, 3000);
await visit('list-kanban', `/projects/${slug}/lists/${listId}/kanban`, 3000);
await visit('list-timeline', `/projects/${slug}/lists/${listId}/timeline`, 3500);
await visit('list-team', `/projects/${slug}/lists/${listId}/team`);
await visit('list-files', `/projects/${slug}/lists/${listId}/files`);
await visit('list-notes', `/projects/${slug}/lists/${listId}/notes`, 3500);
await visit('list-whiteboards', `/projects/${slug}/lists/${listId}/whiteboards`, 3000);
if (wbs?.[0]?.id) await visit('whiteboard', `/projects/${slug}/lists/${listId}/whiteboards/${wbs[0].id}`, 5000);
if (taskKey) await visit('task', `/projects/${slug}/lists/${listId}/tasks/${taskKey}`, 3500);
await visit('task-new', `/projects/${slug}/lists/${listId}/tasks/new`);
await visit('chat-home', '/chat', 3000);
if (globalChan) await visit('chat-global', `/chat/global/${globalChan}`, 4000);
if (projChan) await visit('chat-project', `/projects/${slug}/chat/${projChan}`, 4000);
await visit('notifications', '/notifications');
await visit('me', '/me');
await visit('me-saved', '/me/saved');
await visit('settings-profile', '/settings/profile');
await visit('settings-appearance', '/settings/appearance');
await visit('settings-notifications', '/settings/notifications');
await visit('admin', '/admin', 3500);
await visit('godmode', '/godmode', 3000);
await visit('project-new', '/projects/new');
await visit('legal-terms', '/legal/terms');
await visit('voice-lobby', '/chat', 1500);

console.log('\nUNHANDLED API ROUTES:', [...unhandled]);
console.log(`\nPROBLEMS (${problems.length}):`);
for (const p of problems.slice(0, 60)) console.log(' -', p);
await browser.close();
server?.kill();
