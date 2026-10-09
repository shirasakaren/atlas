#!/usr/bin/env node
/**
 * Verifies the "edits stay in your browser" contract on the built demo:
 *   1. create a project + task at runtime (via the in-browser API)
 *   2. hard-load the brand-new URLs (GitHub-Pages 404.html path) → they render
 *   3. edit a seeded task, reload → the edit is still there (IndexedDB overlay)
 *   4. a second, fresh browser context sees none of it (no sharing)
 *   5. "Reset data" restores the pristine seed
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const base = process.env.DEMO_BASE ?? 'http://localhost:4173';
let server;
if (!process.env.DEMO_BASE) {
  server = spawn(process.execPath, [join(here, 'serve-demo.mjs'), '4173'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
}
const API = 'https://demo.atlas.invalid/api/v1';
const browser = await chromium.launch({ args: process.env.PW_ARGS ? process.env.PW_ARGS.split('|') : [] });
let failed = 0;
const check = (name, ok, d = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${d ? ` — ${d}` : ''}`);
  if (!ok) failed++;
};

async function call(page, method, path, body) {
  return page.evaluate(
    async ([API, method, path, body]) => {
      const s = JSON.parse(localStorage.getItem('atlas_session') || 'null');
      const r = await fetch(API + path, {
        method,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${s?.sessionId}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const t = await r.text();
      return { status: r.status, body: t ? JSON.parse(t) : null };
    },
    [API, method, path, body],
  );
}

const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const a = await ctxA.newPage();
const errors = [];
a.on('pageerror', (e) => errors.push(e.message));
await a.goto(base + '/dashboard');
await a.waitForTimeout(3000);

// 1. create a project + task
const created = await call(a, 'POST', '/projects', {
  title: 'Persistence Probe Initiative',
  shortDescription: 'Created in the browser during a test',
  description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] },
  phase: 'PLANNING',
  visibility: 'PUBLIC',
  tagIds: [],
  techStack: [],
  collaborationRoles: [],
});
check('create project', created.status < 300, JSON.stringify(created.body).slice(0, 120));
const slug = created.body?.slug;
const lists = await call(a, 'GET', `/projects/${slug}/task-lists`);
const listId = lists.body?.[0]?.id;
check('new project got a default task list', !!listId);
const task = await call(a, 'POST', `/projects/${slug}/task-lists/${listId}/tasks`, { title: 'Probe task from test' });
check('create task', task.status < 300, task.body?.key);

// 2. hard-load brand-new URLs
await a.goto(`${base}/projects/${slug}/lists/${listId}/tasks/${task.body?.key}`);
await a.waitForTimeout(4500);
const txt = await a.evaluate(() => document.body.innerText + ' ' + Array.from(document.querySelectorAll('input,textarea')).map((e) => e.value).join(' '));
check('hard-load of runtime-created task URL renders it', txt.includes('Probe task from test'), a.url());

// 3. edit seeded task + reload
const seeded = await call(a, 'GET', '/projects/customer-portal-redesign/task-lists/tls_0001/tasks');
const t0 = (seeded.body.items ?? seeded.body)[0];
const patched = await call(a, 'PATCH', `/projects/customer-portal-redesign/tasks/${t0.id}`, { title: 'EDITED BY VISITOR' });
check('patch seeded task', patched.status < 300);
await a.waitForTimeout(800); // overlay flush debounce
await a.reload();
await a.waitForTimeout(3500);
if (process.env.DBG) console.log("after reload URL", a.url(), (await a.evaluate(() => document.body.innerText)).slice(0, 200));
const after = await call(a, 'GET', `/projects/customer-portal-redesign/tasks/${t0.id}`);
check('edit survives reload', after.body?.title === 'EDITED BY VISITOR', after.body?.title);
const proj = await call(a, 'GET', `/projects/${slug}`);
check('created project survives reload', proj.status === 200 && proj.body?.title === 'Persistence Probe Initiative');

// 4. fresh context sees pristine data
const ctxB = await browser.newContext();
const b = await ctxB.newPage();
await b.goto(base + '/dashboard');
await b.waitForTimeout(3000);
const other = await call(b, 'GET', `/projects/${slug}`);
check('other visitor does NOT see the new project', other.status === 404, String(other.status));
const otherTask = await call(b, 'GET', `/projects/customer-portal-redesign/tasks/${t0.id}`);
check('other visitor sees original title', otherTask.body?.title !== 'EDITED BY VISITOR', otherTask.body?.title);

// 5. reset
await a.goto(base + '/dashboard');
await a.waitForTimeout(2500);
await a.getByRole('button', { name: /live demo/i }).click();
a.once('dialog', (d) => d.accept());
await a.getByRole('button', { name: /reset data/i }).click();
await a.waitForTimeout(4000);
const reset = await call(a, 'GET', `/projects/${slug}`);
check('reset data wipes local edits', reset.status === 404, String(reset.status));

console.log('page errors:', errors.slice(0, 5));
await browser.close();
server?.kill();
process.exit(failed ? 1 : 0);
