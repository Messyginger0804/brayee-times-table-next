import { BrayleeFace } from './BrayleeCheer';

/**
 * App logo badge: Braylee's face in a glowing helmet ring beside the "Braylee's Mission Control" wordmark.
 *   as         wordmark element: 'p' (default) or 'h1' when it is the page heading.
 *   size       face diameter in px (default 44).
 *   className  extra classes on the row.
 * The glow pulse only runs when the user has not asked for reduced motion.
 */
export default function BrandBadge({ as: Tag = 'p', size = 44, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} data-testid="brand-badge">
      <span className="relative inline-flex shrink-0 rounded-full bg-gradient-to-b from-white to-[#cbc3ff] p-1">
        <span aria-hidden="true" className="absolute -inset-1 -z-10 rounded-full bg-neon-cyan/40 blur-md motion-safe:animate-pulse" />
        <BrayleeFace size={size} alt="" />
      </span>
      <Tag className="min-w-0 text-title font-bold leading-tight text-neon-cyan text-glow">
        Braylee&apos;s Mission Control
      </Tag>
    </div>
  );
}
