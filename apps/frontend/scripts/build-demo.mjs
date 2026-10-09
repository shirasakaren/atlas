#!/usr/bin/env node
/**
 * Build the static, backend-less demo of Atlas for GitHub Pages.
 *
 *   node scripts/build-demo.mjs            → apps/frontend/dist-demo/
 *
 * The app is built from a throwaway copy (`.demo-build/`) so server-only
 * pieces (route handlers, middleware, the health page) can be dropped without
 * touching the working tree, then `out/` is post-processed for GitHub Pages
 * (CNAME, .nojekyll, SPA fallback 404.html).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = join(root, '.demo-build');
const dist = join(root, 'dist-demo');
const DOMAIN = process.env.DEMO_DOMAIN ?? 'atlas.creations.ren';

function log(msg) {
  console.log(`\x1b[36m[demo-build]\x1b[0m ${msg}`);
}

// ── 1. fresh working copy ───────────────────────────────────────────────
log('copying sources');
rmSync(work, { recursive: true, force: true });
rmSync(dist, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
for (const p of ['src', 'public', 'next.config.mjs', 'tsconfig.json', 'postcss.config.mjs', 'tailwind.config.ts', 'package.json']) {
  cpSync(join(root, p), join(work, p), { recursive: true });
}

// ── 2. drop what cannot exist in a static export ───────────────────────
// (intercepting routes are unsupported in static export: tasks open on their full-page route)
for (const p of ['src/app/api', 'src/middleware.ts', 'src/app/health', 'src/app/opengraph-image.tsx', 'src/app/apple-icon.tsx', 'public/sw.js', 'src/app/(authenticated)/projects/[slug]/lists/[listId]/@modal']) {
  rmSync(join(work, p), { recursive: true, force: true });
}

// Dev aid: `--bare` builds without the domain seeders/handlers (routing smoke test).
if (process.argv.includes('--bare')) {
  const keep = { handlers: ['index.ts'], seed: ['index.ts', 'people.ts', 'projects.ts', 'catalog.ts', 'domains.ts'] };
  for (const [dir, files] of Object.entries(keep)) {
    for (const f of readdirSync(join(work, 'src/lib/demo', dir))) {
      if (!files.includes(f)) rmSync(join(work, 'src/lib/demo', dir, f), { recursive: true, force: true });
    }
  }
  rmSync(join(work, 'src/lib/demo/livekit-mock.ts'), { force: true });
  writeFileSync(join(work, 'src/lib/demo/handlers/index.ts'), 'export {};\n');
  writeFileSync(join(work, 'src/lib/demo/seed/domains.ts'), 'export {};\n');
  log('bare mode: domain seeders/handlers stubbed out');
}

// ── 3. build ────────────────────────────────────────────────────────────
const version = (process.env.GITHUB_SHA ?? String(Date.now())).slice(0, 12);
const env = {
  ...process.env,
  NEXT_PUBLIC_DEMO: 'true',
  NEXT_PUBLIC_DEMO_VERSION: version,
  // Never resolves: every request to it is answered in the browser (src/lib/demo/fetch.ts).
  NEXT_PUBLIC_API_URL: 'https://demo.atlas.invalid/api/v1',
  NEXT_PUBLIC_APP_URL: `https://${DOMAIN}`,
  NEXT_PUBLIC_PMO_ENABLED: 'true',
  NEXT_PUBLIC_VOICE_ENABLED: 'true',
  NEXT_PUBLIC_LIVEKIT_URL: 'wss://demo.atlas.invalid/livekit',
  NEXT_TELEMETRY_DISABLED: '1',
};
delete env.NEXT_PUBLIC_YJS_WS_URL;

const nextBin = join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
log(`next build (version ${version})`);
const r = spawnSync(process.execPath, [nextBin, 'build'], { cwd: work, env, stdio: 'inherit' });
if (r.status !== 0) {
  console.error('next build failed');
  process.exit(r.status ?? 1);
}

const out = join(work, 'out');
if (!existsSync(join(out, 'index.html'))) {
  console.error('export produced no index.html');
  process.exit(1);
}

// ── 4. GitHub Pages post-processing ────────────────────────────────────
cpSync(out, dist, { recursive: true });
writeFileSync(join(dist, 'CNAME'), `${DOMAIN}\n`);
writeFileSync(join(dist, '.nojekyll'), '');
writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n`,
);

/**
 * GitHub Pages answers unknown paths (projects/tasks created at runtime,
 * deep links to real ids) with this file. It parks the requested path and
 * bounces to `/`, where the app boots and routes there client-side.
 * A path that was already tried once is NOT retried (no redirect loop): the
 * visitor gets a plain "not found" with a way home instead.
 */
const fallback = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,system-ui,sans-serif;background:#fff;color:#14161a}
  .box{text-align:center;padding:24px}
  a{color:#1d4ed8;font-weight:600;text-decoration:none}
  h1{font-size:22px;margin:0 0 8px}
  p{margin:0 0 16px;color:#5b616b}
  @media(prefers-color-scheme:dark){body{background:#0f1115;color:#eceef1}p{color:#9aa1ab}a{color:#7ea5ff}}
</style>
</head>
<body>
<div class="box" id="msg" hidden>
  <h1>Page not found</h1>
  <p>That page doesn't exist in the demo (or it only existed in a previous session).</p>
  <a href="/">Back to Atlas</a>
</div>
<script>
(function () {
  try {
    var path = location.pathname + location.search + location.hash;
    var last = JSON.parse(sessionStorage.getItem('atlas_spa_last') || 'null');
    // Bounced straight back here within seconds of routing to this path: it really doesn't exist.
    if (last && last.p === path && Date.now() - last.t < 6000) {
      sessionStorage.removeItem('atlas_spa_last');
      document.getElementById('msg').hidden = false;
      return;
    }
    sessionStorage.setItem('atlas_spa_path', path);
    location.replace('/');
  } catch (e) {
    document.getElementById('msg').hidden = false;
  }
})();
</script>
</body>
</html>
`;
writeFileSync(join(dist, '404.html'), fallback);

function count(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? count(join(dir, e.name)) : 1;
  }
  return n;
}
log(`done: ${count(dist)} files → ${dist}`);
log(`size of out/: ${(statSync(join(dist, 'index.html')).size / 1024).toFixed(1)} KB index.html`);
