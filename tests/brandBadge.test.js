import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BrandBadge from '../components/braylee/BrandBadge';

describe('BrandBadge', () => {
  it('renders the wordmark as a paragraph by default', () => {
    const html = renderToStaticMarkup(createElement(BrandBadge));
    expect(html).toContain('data-testid="brand-badge"');
    expect(html).toMatch(/<p [^>]*>Braylee&#x27;s Mission Control<\/p>/);
  });
  it('can be the page heading and respects reduced motion via motion-safe', () => {
    const html = renderToStaticMarkup(createElement(BrandBadge, { as: 'h1' }));
    expect(html).toMatch(/<h1 /);
    expect(html).toContain('motion-safe:animate-pulse');
    expect(html).not.toMatch(/(^|\s)animate-pulse/);
  });
});
