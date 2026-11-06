/**
 * "Braylee's Mission Control" wordmark (text only; Braylee's face lives in the host astronaut).
 *   as         element: 'p' (default) or 'h1' when it is the page heading.
 *   className  extra classes.
 */
export default function Wordmark({ as: Tag = 'p', className = '' }) {
  return (
    <Tag data-testid="wordmark" className={`text-balance text-center text-title font-bold leading-tight text-neon-cyan text-glow ${className}`}>
      Braylee&apos;s Mission Control
    </Tag>
  );
}
