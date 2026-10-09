/**
 * Tiny synthesised audio for the demo (soundboard stings, recording download).
 * Everything is generated as 16-bit mono WAV so it plays anywhere and needs no
 * hosted assets. Pure functions: safe to run in the Node harness.
 */
import { createRng } from '../prng';

const RATE = 8000;

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Encode float samples (-1..1) as a WAV file. */
export function wavBytes(samples: Float32Array, rate = RATE): Uint8Array {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return new Uint8Array(buf);
}

export function wavDataUri(samples: Float32Array, rate = RATE): string {
  return `data:audio/wav;base64,${toBase64(wavBytes(samples, rate))}`;
}

// ─── Building blocks ───────────────────────────────────────────────────

const TAU = Math.PI * 2;

function buffer(ms: number): Float32Array {
  return new Float32Array(Math.floor((ms / 1000) * RATE));
}

function env(t: number, dur: number, attack = 0.01, release = 0.1): number {
  if (t < attack) return t / attack;
  if (t > dur - release) return Math.max(0, (dur - t) / release);
  return 1;
}

function saw(phase: number): number {
  return 2 * (phase - Math.floor(phase + 0.5));
}

function square(phase: number): number {
  return phase - Math.floor(phase) < 0.5 ? 1 : -1;
}

/** Add a tone into `out` starting at `startMs`. */
function tone(
  out: Float32Array,
  startMs: number,
  ms: number,
  freq: number | ((t: number) => number),
  opts: { wave?: 'sine' | 'saw' | 'square'; gain?: number; attack?: number; release?: number; decay?: number } = {},
): void {
  const start = Math.floor((startMs / 1000) * RATE);
  const len = Math.floor((ms / 1000) * RATE);
  const dur = ms / 1000;
  const gain = opts.gain ?? 0.5;
  let phase = 0;
  for (let i = 0; i < len && start + i < out.length; i++) {
    const t = i / RATE;
    const f = typeof freq === 'function' ? freq(t) : freq;
    phase += f / RATE;
    let s: number;
    switch (opts.wave) {
      case 'saw':
        s = saw(phase);
        break;
      case 'square':
        s = square(phase);
        break;
      default:
        s = Math.sin(TAU * phase);
    }
    const decay = opts.decay ? Math.exp(-t * opts.decay) : 1;
    out[start + i]! += s * gain * env(t, dur, opts.attack, opts.release) * decay;
  }
}

function noise(
  out: Float32Array,
  rng: ReturnType<typeof createRng>,
  startMs: number,
  ms: number,
  gain: number,
  decay: number,
  hp = 0,
): void {
  const start = Math.floor((startMs / 1000) * RATE);
  const len = Math.floor((ms / 1000) * RATE);
  let prev = 0;
  for (let i = 0; i < len && start + i < out.length; i++) {
    const t = i / RATE;
    const raw = rng.next() * 2 - 1;
    const x = hp > 0 ? raw - prev * hp : raw;
    prev = raw;
    out[start + i]! += x * gain * Math.exp(-t * decay);
  }
}

function normalise(a: Float32Array, peak = 0.85): Float32Array {
  let m = 0;
  for (const x of a) m = Math.max(m, Math.abs(x));
  if (m > 0) for (let i = 0; i < a.length; i++) a[i] = (a[i]! / m) * peak;
  return a;
}

// ─── Soundboard clips ──────────────────────────────────────────────────

export interface SynthClip {
  key: string;
  name: string;
  durationMs: number;
  render: () => Float32Array;
}

export const SYNTH_CLIPS: SynthClip[] = [
  {
    key: 'airhorn',
    name: 'Air Horn',
    durationMs: 1100,
    render: () => {
      const o = buffer(1100);
      for (const [start, ms] of [
        [0, 380],
        [440, 600],
      ] as const) {
        const vib = (t: number) => 1 + 0.012 * Math.sin(TAU * 7 * t);
        tone(o, start, ms, (t) => 466 * vib(t), { wave: 'saw', gain: 0.3, release: 0.08 });
        tone(o, start, ms, (t) => 622 * vib(t), { wave: 'square', gain: 0.18, release: 0.08 });
        tone(o, start, ms, (t) => 932 * vib(t), { wave: 'saw', gain: 0.12, release: 0.08 });
      }
      return normalise(o);
    },
  },
  {
    key: 'rimshot',
    name: 'Rimshot',
    durationMs: 800,
    render: () => {
      const rng = createRng('clip-rimshot');
      const o = buffer(800);
      tone(o, 0, 160, 170, { gain: 0.9, decay: 22, attack: 0.002 });
      noise(o, rng, 0, 140, 0.5, 24);
      tone(o, 190, 160, 140, { gain: 0.9, decay: 22, attack: 0.002 });
      noise(o, rng, 190, 140, 0.5, 24);
      noise(o, rng, 400, 380, 0.45, 7, 0.95);
      return normalise(o);
    },
  },
  {
    key: 'applause',
    name: 'Applause',
    durationMs: 1600,
    render: () => {
      const rng = createRng('clip-applause');
      const o = buffer(1600);
      for (let c = 0; c < 190; c++) {
        const at = rng.range(0, 1400);
        const swell = Math.sin((Math.PI * at) / 1500);
        noise(o, rng, at, 22, 0.28 * swell, 90, 0.8);
      }
      return normalise(o, 0.8);
    },
  },
  {
    key: 'trombone',
    name: 'Sad Trombone',
    durationMs: 1600,
    render: () => {
      const o = buffer(1600);
      const notes: [number, number, number][] = [
        [0, 320, 311],
        [340, 320, 294],
        [680, 320, 277],
      ];
      for (const [s, ms, f] of notes) tone(o, s, ms, f, { wave: 'saw', gain: 0.35, release: 0.06 });
      tone(o, 1020, 560, (t) => 262 - 38 * t * (t < 0.4 ? 1 : 0.4) + 6 * Math.sin(TAU * 6 * t), {
        wave: 'saw',
        gain: 0.38,
        release: 0.2,
      });
      return normalise(o);
    },
  },
  {
    key: 'tada',
    name: 'Ta-da!',
    durationMs: 1000,
    render: () => {
      const o = buffer(1000);
      for (const [s, f] of [
        [0, 392],
        [110, 523],
        [220, 659],
      ] as const) {
        tone(o, s, 140, f, { wave: 'square', gain: 0.2, release: 0.05 });
      }
      for (const f of [523, 659, 784, 1046]) tone(o, 340, 640, f, { gain: 0.2, release: 0.35, decay: 2.4 });
      return normalise(o);
    },
  },
  {
    key: 'ding',
    name: 'Ding',
    durationMs: 800,
    render: () => {
      const o = buffer(800);
      tone(o, 0, 800, 1318, { gain: 0.6, decay: 5, attack: 0.002 });
      tone(o, 0, 800, 2637, { gain: 0.2, decay: 8, attack: 0.002 });
      tone(o, 0, 800, 3951, { gain: 0.08, decay: 11, attack: 0.002 });
      return normalise(o);
    },
  },
  {
    key: 'drumroll',
    name: 'Drumroll',
    durationMs: 1500,
    render: () => {
      const rng = createRng('clip-drumroll');
      const o = buffer(1500);
      let t = 0;
      let gap = 70;
      while (t < 1150) {
        tone(o, t, 90, 120, { gain: 0.5, decay: 30, attack: 0.001 });
        noise(o, rng, t, 70, 0.35, 40);
        t += gap;
        gap = Math.max(26, gap * 0.93);
      }
      tone(o, 1180, 320, 90, { gain: 0.8, decay: 9, attack: 0.002 });
      noise(o, rng, 1180, 320, 0.7, 6, 0.9);
      return normalise(o);
    },
  },
  {
    key: 'levelup',
    name: 'Level Up',
    durationMs: 800,
    render: () => {
      const o = buffer(800);
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
        tone(o, i * 85, 110, f, { wave: 'square', gain: 0.22, release: 0.03 }),
      );
      tone(o, 520, 280, 2093, { wave: 'square', gain: 0.16, release: 0.12, decay: 5 });
      return normalise(o);
    },
  },
  {
    key: 'crickets',
    name: 'Crickets',
    durationMs: 1400,
    render: () => {
      const o = buffer(1400);
      for (const base of [0, 700]) {
        for (let i = 0; i < 4; i++) {
          tone(o, base + i * 70, 40, 4200 + (i % 2) * 120, { gain: 0.3, attack: 0.004, release: 0.01 });
        }
      }
      return normalise(o, 0.6);
    },
  },
];

const clipCache = new Map<string, string>();

/** Data URI for a built-in clip (rendered once, then cached). */
export function clipDataUri(key: string): string {
  let uri = clipCache.get(key);
  if (!uri) {
    const clip = SYNTH_CLIPS.find((c) => c.key === key);
    uri = clip ? wavDataUri(clip.render()) : wavDataUri(new Float32Array(RATE / 10));
    clipCache.set(key, uri);
  }
  return uri;
}

/** A calm few seconds of "meeting audio" for the recordings download. */
export function recordingSample(seconds = 8): Uint8Array {
  const o = buffer(seconds * 1000);
  const chords = [
    [220, 277, 330],
    [196, 247, 294],
    [174, 220, 262],
    [196, 247, 330],
  ];
  const seg = (seconds * 1000) / chords.length;
  chords.forEach((c, i) => {
    for (const f of c) tone(o, i * seg, seg + 200, (t) => f * (1 + 0.002 * Math.sin(TAU * 0.6 * t)), {
      gain: 0.18,
      attack: 0.4,
      release: 0.6,
    });
  });
  return wavBytes(normalise(o, 0.5));
}
