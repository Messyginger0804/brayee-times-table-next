"use client";

const COINS = { penny: ['1¢', 'bg-[#b8743d]'], nickel: ['5¢', 'bg-[#b9c2cf]'], dime: ['10¢', 'bg-[#dfe6ef]'], quarter: ['25¢', 'bg-[#c9d1dc]'] };

function Box({ typed, size = 'md', status }) {
  const tone = status === 'correct' ? 'border-neon-lime text-neon-lime' : status === 'wrong' ? 'border-neon-coral text-neon-coral' : 'border-dashed border-white/40 text-neon-amber';
  const dims = size === 'sm' ? 'min-h-[2.5rem] min-w-[2.5rem] px-1.5 text-[1.5rem]' : 'min-h-[3rem] min-w-[3.25rem] px-2';
  return (
    <span className={`inline-flex items-center justify-center rounded-chunk border-2 align-middle ${dims} ${tone}`}>
      {typed || <span className="opacity-40">?</span>}
    </span>
  );
}

function Frac({ num, den, typed, status }) {
  const slot = (v) => (v === null ? <Box typed={typed} size="sm" status={status} /> : <span>{v}</span>);
  return (
    <span className="mx-1 inline-flex flex-col items-center align-middle leading-none" role="img" aria-label={`${num ?? 'blank'} over ${den ?? 'blank'}`}>
      <span className="px-1.5 pb-1">{slot(num)}</span>
      <span aria-hidden="true" className="h-[3px] w-full rounded bg-current" />
      <span className="px-1.5 pt-1">{slot(den)}</span>
    </span>
  );
}

/**
 * Renders a library problem's `promptParts` inline (text, blank answer box, stacked fractions, mixed numbers, powers, coins).
 * The blank (or a null fraction slot) shows what the child has typed so far.
 */
export default function PromptParts({ parts, typed, status }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-2 font-bold text-ink">
      {parts.map((p, i) => {
        switch (p.t) {
          case 'text': return <span key={i} className="whitespace-pre-wrap">{p.v}</span>;
          case 'blank': return <Box key={i} typed={typed} status={status} />;
          case 'fraction': return <Frac key={i} num={p.num} den={p.den} typed={typed} status={status} />;
          case 'mixed': return (
            <span key={i} className="inline-flex items-center"><span>{p.whole}</span><Frac num={p.num} den={p.den} /></span>
          );
          case 'power': return <span key={i}>{p.base}<sup className="text-[0.6em]">{p.exp}</sup></span>;
          case 'coin': {
            const [cents, bg] = COINS[p.coin] || ['¢', 'bg-ink'];
            return (
              <span key={i} className="inline-flex items-center gap-0.5" role="img" aria-label={`${p.count} ${p.coin}${p.count === 1 ? '' : p.coin === 'penny' ? '' : 's'}`}>
                {Array.from({ length: Math.min(p.count, 8) }, (_, k) => (
                  <span key={k} aria-hidden="true" className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/60 text-xs font-bold text-space-950 ${bg}`}>{cents}</span>
                ))}
              </span>
            );
          }
          default: return null;
        }
      })}
    </p>
  );
}

function partText(p) {
  switch (p.t) {
    case 'text': return p.v;
    case 'blank': return 'blank';
    case 'fraction': return `${p.num ?? 'blank'} over ${p.den ?? 'blank'}`;
    case 'mixed': return `${p.whole} and ${p.num} over ${p.den}`;
    case 'power': return `${p.base} to the power ${p.exp}`;
    case 'coin': return `${p.count} ${p.coin}`;
    default: return '';
  }
}

export const hasBlank = (parts) => parts.some((p) => p.t === 'blank' || (p.t === 'fraction' && (p.num === null || p.den === null)));
