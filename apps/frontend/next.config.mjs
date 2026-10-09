import fs from 'node:fs';
import path from 'node:path';

/** @type {import('next').NextConfig} */

// Security response headers applied to every route. Tuned so the voice/video
// + screen-share features keep working (camera/microphone/display-capture are
// allowed for same-origin). CSP is intentionally deferred to a dedicated,
// report-only rollout once GlitchTip's report endpoint exists — a wrong CSP
// would break the SPA, Keycloak redirects, S3 media, and the LiveKit/socket
// connections.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), autoplay=(self), geolocation=(), payment=(), usb=()',
  },
];

// Static, backend-less portfolio demo (GitHub Pages). Built by scripts/build-demo.mjs.
const isDemo = process.env.NEXT_PUBLIC_DEMO === 'true';

const nextConfig = {
  ...(isDemo
    ? {
        // Fully static export; the in-browser mock API lives in src/lib/demo.
        output: 'export',
        eslint: { ignoreDuringBuilds: true },
      }
    : {
        output: 'standalone',
        // Monorepo: standalone output tracing must root at the workspace root so
        // pnpm-workspace-linked dependencies are traced into .next/standalone.
        outputFileTracingRoot: path.join(process.cwd(), '../..'),
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  webpack(config) {
    if (isDemo) {
      // No LiveKit SFU in the static demo: swap in a simulated room.
      const mock = path.join(process.cwd(), 'src/lib/demo/livekit-mock.ts');
      if (fs.existsSync(mock)) config.resolve.alias['livekit-client'] = mock;
    }
    return config;
  },
  images: {
    unoptimized: isDemo,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.labmgm.org' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'iam.labmgm.org' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      // Railway production's local storage provider serves uploaded media
      // (avatars, project covers/gallery) straight off the API host - this
      // was missing entirely, so every real project thumbnail 400'd here
      // the same way the seeded ones do.
      { protocol: 'https', hostname: 'api.atlas.creations.ren' },
      // Demo-data stock imagery: Picsum project covers (redirects to its
      // fastly subdomain) and randomuser.me portraits.
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.picsum.photos' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
};

export default nextConfig;

// Why: LiveKit room participant limits — see the ADR in docs/adr/
