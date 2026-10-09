import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEMO } from '@/lib/demo/config';
import { DEMO_LEGAL_TEXT } from '@/lib/demo/legal';
import { ArrowLeft } from 'lucide-react';
import { PatternCorner } from '@/components/brand/pattern-corner';
import { ShapeSignature } from '@/components/brand/shape-signature';
import { Wordmark } from '@/components/brand/wordmark';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const TITLES: Record<string, string> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
};

interface Block {
  kind: 'heading' | 'paragraph';
  content: string;
}

/**
 * The legal copy is plain text, so structure has to be inferred:
 * blank lines separate blocks, and a lone short line with no trailing
 * period is treated as a section heading.
 */
function parseBlocks(text: string): Block[] {
  return text
    .split(/\n{2,}/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block): Block => {
      const lines = block.split('\n').map((l) => l.trim());
      if (lines.length === 1 && lines[0].length <= 60 && !lines[0].endsWith('.')) {
        return { kind: 'heading', content: lines[0] };
      }
      return { kind: 'paragraph', content: block };
    });
}

// Static export needs the full set of legal pages up front.
export function generateStaticParams() {
  return Object.keys(TITLES).map((page) => ({ page }));
}

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const title = TITLES[page];
  if (!title) notFound();

  let text = '';
  if (DEMO) {
    text = DEMO_LEGAL_TEXT[page] ?? '';
  } else try {
    const res = await fetch(`${API_BASE}/public-config/legal/${page}`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { text?: string };
      text = data.text ?? '';
    }
  } catch {
    // Treat as unpublished below.
  }
  // An operator who hasn't written this document yet would otherwise serve
  // the framework's bare 404 page, which looks like a broken deploy.
  if (!text) {
    return (
      <main className="relative min-h-svh bg-surface px-6 py-12">
        <PatternCorner position="top-right" size={2} cellSize={56} />
        <div className="relative z-10 mx-auto w-full max-w-prose">
          <div className="mb-8 flex items-center gap-3">
            <ShapeSignature size={28} />
            <Wordmark withSignature={false} className="text-[20px]" />
          </div>
          <span className="text-eyebrow uppercase text-brand-blue">Legal</span>
          <h1 className="mt-2 font-display text-display-lg tracking-[-0.02em] text-ink">
            {title}
          </h1>
          <p className="mt-3 text-body text-ink-2">
            This instance hasn’t published {title.toLowerCase()} yet. An administrator can add
            it in godmode under Site.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 py-2 text-[13px] font-medium text-brand-blue hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Back to Atlas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-svh bg-surface px-6 py-12">
      <PatternCorner position="top-right" size={2} cellSize={56} />
      <div className="relative z-10 mx-auto w-full max-w-prose">
        <div className="mb-8 flex items-center gap-3">
          <ShapeSignature size={28} />
          <Wordmark withSignature={false} className="text-[20px]" />
        </div>
        <span className="text-eyebrow uppercase text-brand-blue">Legal</span>
        <h1 className="mt-2 font-display text-display-lg tracking-[-0.02em] text-ink">{title}</h1>
        <Link
          href="/"
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-blue hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
          Back to Atlas
        </Link>
        <div className="mt-8 space-y-4">
          {parseBlocks(text).map((b, i) =>
            b.kind === 'heading' ? (
              <h2 key={i} className="pt-2 font-display text-h3 tracking-[-0.01em] text-ink">
                {b.content}
              </h2>
            ) : (
              <p key={i} className="whitespace-pre-wrap text-body text-ink-2">
                {b.content}
              </p>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
