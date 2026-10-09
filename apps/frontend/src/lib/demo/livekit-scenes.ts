/**
 * Synthetic "video" for the LiveKit stand-in: animated canvases captured as
 * MediaStreams. They stand in for cameras and screen shares so the voice room
 * UI (tiles, spotlight, screen-share layout) has something real to render
 * without ever asking for camera / screen permissions.
 *
 * Browser only (needs `document` + `canvas.captureStream`); every entry point
 * degrades to `null` when unavailable so Node tooling never touches it.
 */

export type SceneKind = 'camera' | 'dashboard' | 'slides' | 'code' | 'desktop';

export interface Scene {
  stream: MediaStream | null;
  /** Reference-counted: draws only while somebody is attached. */
  retain(): void;
  release(): void;
  stop(): void;
}

interface SceneOpts {
  kind: SceneKind;
  /** Person's name (camera initials / screen owner). */
  label: string;
  /** Hue seed 0-360. */
  hue: number;
}

const W = 960;
const H = 540;

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1]![0]! : '')).toUpperCase();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FONT = '"Inter","Segoe UI",Arial,sans-serif';

function drawCamera(ctx: CanvasRenderingContext2D, t: number, o: SceneOpts) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, `hsl(${o.hue} 38% 22%)`);
  g.addColorStop(1, `hsl(${(o.hue + 40) % 360} 42% 34%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Soft bokeh.
  for (let i = 0; i < 7; i++) {
    const x = ((i * 173 + t * 6 * (1 + (i % 3))) % (W + 200)) - 100;
    const y = 80 + ((i * 97) % 380) + Math.sin(t * 0.4 + i) * 12;
    ctx.fillStyle = `hsla(${(o.hue + i * 18) % 360} 60% 70% / 0.08)`;
    ctx.beginPath();
    ctx.arc(x, y, 60 + (i % 4) * 22, 0, Math.PI * 2);
    ctx.fill();
  }
  const breathe = 1 + Math.sin(t * 1.6) * 0.012;
  const cx = W / 2 + Math.sin(t * 0.5) * 6;
  // Shoulders + head silhouette.
  ctx.fillStyle = `hsl(${o.hue} 30% 16%)`;
  ctx.beginPath();
  ctx.ellipse(cx, H + 40, 250 * breathe, 190 * breathe, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = `hsl(${o.hue} 28% 62%)`;
  ctx.beginPath();
  ctx.arc(cx, 210 - (breathe - 1) * 300, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `hsl(${o.hue} 30% 20%)`;
  ctx.beginPath();
  ctx.arc(cx, 186, 98, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.font = `600 34px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(initials(o.label), cx, 222);
}

function drawDashboard(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#111b30';
  ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `600 20px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('INC-4821 · Checkout latency', 24, 35);
  const live = Math.floor(t * 2) % 2 === 0;
  ctx.fillStyle = live ? '#ef4444' : '#7f1d1d';
  ctx.beginPath();
  ctx.arc(W - 90, 28, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 13px ${FONT}`;
  ctx.fillText('LIVE', W - 76, 33);

  // Line chart (p95 latency).
  const cx0 = 24, cy0 = 84, cw = 600, ch = 250;
  ctx.fillStyle = '#111b30';
  rr(ctx, cx0, cy0, cw, ch, 10);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 12px ${FONT}`;
  ctx.fillText('p95 latency (ms)', cx0 + 16, cy0 + 24);
  ctx.strokeStyle = 'rgba(148,163,184,.15)';
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx0 + 16, cy0 + 40 + i * 40);
    ctx.lineTo(cx0 + cw - 16, cy0 + 40 + i * 40);
    ctx.stroke();
  }
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const tt = t * 0.8 + i * 0.22;
    const v = 0.55 + 0.18 * Math.sin(tt * 0.9) + 0.1 * Math.sin(tt * 2.3) - Math.max(0, 0.28 - Math.abs(((tt * 0.12) % 3) - 1.5) * 0.25);
    const x = cx0 + 16 + (i / 60) * (cw - 32);
    const y = cy0 + ch - 20 - v * (ch - 70);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;

  // KPI cards.
  const kpis = [
    ['Error rate', `${(0.38 + Math.sin(t * 0.7) * 0.06).toFixed(2)}%`, '#f59e0b'],
    ['p95', `${Math.round(296 + Math.sin(t * 1.1) * 22)} ms`, '#38bdf8'],
    ['Queue depth', `${Math.round(1180 + Math.sin(t * 0.5) * 120)}`, '#34d399'],
  ] as const;
  kpis.forEach(([label, val, color], i) => {
    const y = 84 + i * 86;
    ctx.fillStyle = '#111b30';
    rr(ctx, 644, y, 292, 74, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 12px ${FONT}`;
    ctx.fillText(label, 660, y + 24);
    ctx.fillStyle = color;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(val, 660, y + 56);
  });

  // Bars (per-region).
  ctx.fillStyle = '#111b30';
  rr(ctx, 24, 352, 912, 164, 10);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 12px ${FONT}`;
  ctx.fillText('Requests by region', 40, 376);
  const regions = ['us-east', 'ca-central', 'eu-west', 'ap-south', 'sa-east', 'us-west', 'eu-north', 'ap-east'];
  regions.forEach((r, i) => {
    const v = 0.35 + 0.55 * Math.abs(Math.sin(i * 1.7 + t * 0.6));
    const x = 48 + i * 110;
    ctx.fillStyle = i === 2 ? '#f59e0b' : '#3b82f6';
    rr(ctx, x, 496 - v * 100, 56, v * 100, 5);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = `500 11px ${FONT}`;
    ctx.fillText(r, x - 2, 512);
  });
  drawCursor(ctx, t, 300, 200);
}

const SLIDES: { title: string; bullets: string[] }[] = [
  { title: 'Q4 priorities', bullets: ['Ship Customer Portal redesign', 'Finish warehouse migration', 'SOC 2 Type II audit window', 'Hold cloud spend flat'] },
  { title: 'Delivery health', bullets: ['41 programs on track', '9 at risk, 3 need decisions today', 'Median cycle time down 18%', 'Two vendor dependencies slipping'] },
  { title: 'Risks & asks', bullets: ['Staffing gap in Data Platform', 'Security review capacity in Nov', 'Decision needed: region failover scope'] },
  { title: 'Questions?', bullets: ['Raise your hand to join the queue', 'Or drop it in the thread'] },
];

function drawSlides(ctx: CanvasRenderingContext2D, t: number, o: SceneOpts) {
  const idx = Math.floor(t / 7) % SLIDES.length;
  const s = SLIDES[idx]!;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#f8fafc');
  g.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `hsl(${o.hue} 70% 42%)`;
  ctx.fillRect(0, 0, 14, H);
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 46px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(s.title, 70, 110);
  ctx.font = `500 28px ${FONT}`;
  s.bullets.forEach((b, i) => {
    const vis = Math.min(1, Math.max(0, (t % 7) * 1.4 - i * 0.6));
    ctx.globalAlpha = vis;
    ctx.fillStyle = `hsl(${o.hue} 70% 42%)`;
    ctx.beginPath();
    ctx.arc(80, 183 + i * 70, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillText(b, 104, 193 + i * 70);
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = `500 14px ${FONT}`;
  ctx.fillText('Halcyon Global · All-hands', 70, H - 30);
  ctx.textAlign = 'right';
  ctx.fillText(`${idx + 1} / ${SLIDES.length}`, W - 40, H - 30);
  ctx.textAlign = 'left';
}

const CODE = [
  'export async function reconcile(order: Order) {',
  '  const lines = await ledger.linesFor(order.id);',
  '  const total = lines.reduce((s, l) => s + l.amount, 0);',
  '  if (total !== order.total) {',
  "    await alerts.raise('ledger-mismatch', { order: order.id });",
  '    return retryWithBackoff(() => reconcile(order));',
  '  }',
  '  await events.publish(new OrderSettled(order.id, total));',
  '}',
  '',
  '// TODO(maya): confirm idempotency key on replays',
];

function drawCode(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#181825';
  ctx.fillRect(0, 0, W, 38);
  ctx.fillStyle = '#313244';
  rr(ctx, 14, 6, 170, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#cdd6f4';
  ctx.font = `500 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('settlement.ts', 30, 25);
  ctx.font = '15px "SF Mono","Consolas",monospace';
  const shown = Math.min(CODE.length, 2 + Math.floor(t * 0.6) % (CODE.length + 4));
  CODE.slice(0, shown).forEach((line, i) => {
    ctx.fillStyle = '#585b70';
    ctx.fillText(String(i + 1).padStart(2, ' '), 18, 78 + i * 26);
    ctx.fillStyle = /\/\//.test(line) ? '#6c7086' : /export|async|function|const|if|return|await|new/.test(line) ? '#cba6f7' : '#cdd6f4';
    ctx.fillText(line, 56, 78 + i * 26);
  });
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = '#f5e0dc';
    ctx.fillRect(56 + (CODE[Math.max(0, shown - 1)]?.length ?? 0) * 9, 64 + (shown - 1) * 26, 2, 18);
  }
}

function drawDesktop(ctx: CanvasRenderingContext2D, t: number, o: SceneOpts) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, `hsl(${o.hue} 45% 30%)`);
  g.addColorStop(1, `hsl(${(o.hue + 60) % 360} 50% 20%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  rr(ctx, 90, 70, 780, 380, 12);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(90, 70, 780, 36);
  ['#f87171', '#fbbf24', '#4ade80'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(112 + i * 20, 88, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 28px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('Sharing your screen', 130, 170);
  ctx.fillStyle = '#475569';
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText('Demo mode: nothing real is captured.', 130, 202);
  for (let i = 0; i < 6; i++) {
    const w = 380 + ((i * 97) % 220);
    ctx.fillStyle = i % 2 ? '#cbd5e1' : '#e2e8f0';
    rr(ctx, 130, 240 + i * 30, w, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, H - 46, W, 46);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 14px ${FONT}`;
  ctx.fillText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), W - 90, H - 18);
  drawCursor(ctx, t, 400, 260);
}

function drawCursor(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) {
  const x = cx + Math.sin(t * 0.9) * 220 + Math.sin(t * 2.1) * 30;
  const y = cy + Math.cos(t * 0.7) * 110;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 18);
  ctx.lineTo(x + 5, y + 14);
  ctx.lineTo(x + 10, y + 22);
  ctx.lineTo(x + 13, y + 20);
  ctx.lineTo(x + 8, y + 12);
  ctx.lineTo(x + 14, y + 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
}

export function createScene(opts: SceneOpts): Scene {
  const empty: Scene = { stream: null, retain() {}, release() {}, stop() {} };
  if (typeof document === 'undefined') return empty;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  try {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
  } catch {
    return empty;
  }
  if (!ctx || typeof (canvas as any).captureStream !== 'function') return empty;
  const c = ctx;
  const start = performance.now() / 1000 + opts.hue; // desync scenes
  let refs = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const frame = () => {
    const t = performance.now() / 1000 - start + opts.hue;
    c.textAlign = 'left';
    switch (opts.kind) {
      case 'camera':
        drawCamera(c, t, opts);
        break;
      case 'dashboard':
        drawDashboard(c, t);
        break;
      case 'slides':
        drawSlides(c, t, opts);
        break;
      case 'code':
        drawCode(c, t);
        break;
      default:
        drawDesktop(c, t, opts);
    }
  };
  frame();
  const stream: MediaStream = (canvas as any).captureStream(12);

  const startLoop = () => {
    if (timer) return;
    timer = setInterval(frame, 83);
  };
  const stopLoop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  return {
    stream,
    retain() {
      refs++;
      startLoop();
    },
    release() {
      refs = Math.max(0, refs - 1);
      if (refs === 0) stopLoop();
    },
    stop() {
      refs = 0;
      stopLoop();
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
    },
  };
}
