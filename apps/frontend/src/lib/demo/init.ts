/**
 * Demo bootstrap. Import for side effects from the root layout (via
 * `components/demo/demo-boot`). Runs once per page load, before React hydrates,
 * so the first API call already lands on the in-browser engine.
 */
import { installDemoFetch } from './fetch';
import { ensureDemoSession } from './session';

// (direct env check so the bundler can drop the whole engine from non-demo builds)
if (process.env.NEXT_PUBLIC_DEMO === 'true' && typeof window !== 'undefined') {
  installDemoFetch();
  ensureDemoSession();
  // Warm the engine (seeding runs in the background while the shell renders).
  void import('./engine').then((m) => import('./db').then((d) => d.dbReady().then(() => m)));
}

export {};
