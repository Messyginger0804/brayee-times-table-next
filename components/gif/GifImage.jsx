/**
 * Renders one GIF from config/gifs.ts: webp first, gif fallback, alt text from the title.
 * No hooks, so it works in both server and client components.
 */
export default function GifImage({ gif, className = '', lazy = false, ...rest }) {
  return (
    <picture>
      <source srcSet={gif.webp} type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gif.url}
        alt={gif.title}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        draggable={false}
        className={className}
        {...rest}
      />
    </picture>
  );
}
