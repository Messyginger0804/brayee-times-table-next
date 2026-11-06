import { notFound } from 'next/navigation';
import { GIFS, GIF_CATEGORIES } from '../../config/gifs';
import GifImage from '../../components/gif/GifImage';

export const metadata = { title: 'GIF review (dev only)' };

// Dev-only review page: every GIF in config/gifs.ts, animated, grouped by category.
export default function GifReviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-safe pt-safe pb-safe">
      <h1 className="mb-1 text-hero text-neon-cyan">GIF review</h1>
      <p className="mb-6 text-body text-ink-dim">
        Dev only (404s in production). Edit <code className="rounded bg-space-800 px-1">config/gifs.ts</code> to change what the app shows.
      </p>
      {GIF_CATEGORIES.map((cat) => (
        <section key={cat} className="mb-10" aria-labelledby={`cat-${cat}`}>
          <h2 id={`cat-${cat}`} className="mb-3 text-title text-neon-pink">{cat} <span className="text-lead text-ink-dim">({GIFS[cat].length})</span></h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GIFS[cat].map((g) => (
              <li key={g.id} className="glass overflow-hidden rounded-chunk">
                <GifImage gif={g} lazy className="h-52 w-full bg-space-900 object-contain" />
                <div className="space-y-1 p-3 text-body">
                  <p className="font-bold">{g.title}</p>
                  <p className="text-ink-dim">{g.why}</p>
                  <p className="text-sm text-ink-dim">webp {(g.webpBytes / 1024).toFixed(0)} KB, gif {(g.gifBytes / 1024).toFixed(0)} KB</p>
                  {g.note && <p className="text-sm text-neon-amber">Note: {g.note}</p>}
                  <a href={g.page} target="_blank" rel="noopener noreferrer" className="inline-block min-h-[2rem] text-sm text-neon-cyan underline">Powered by GIPHY</a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
