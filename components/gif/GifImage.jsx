"use client";
/**
 * Renders one GIF from config/gifs.ts: webp first, gif fallback, alt text from the title.
 * A failed load hides the image instead of showing a broken icon.
 */
import { useState } from 'react';

export default function GifImage({ gif, className = '', lazy = false, ...rest }) {
  const [failedUrl, setFailedUrl] = useState(null);
  if (failedUrl === gif.url) return null; // keyed on the url so a reused instance recovers when the gif changes
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
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(gif.url)}
        className={className}
        {...rest}
      />
    </picture>
  );
}
