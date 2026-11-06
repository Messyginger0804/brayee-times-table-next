import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Wordmark from '../components/braylee/Wordmark';

describe('Wordmark', () => {
  it('renders the wordmark as a paragraph by default, without a face image', () => {
    const html = renderToStaticMarkup(createElement(Wordmark));
    expect(html).toMatch(/<p [^>]*>Braylee&#x27;s Space Academy<\/p>/);
    expect(html).not.toContain('<img');
  });
  it('can be the page heading', () => {
    expect(renderToStaticMarkup(createElement(Wordmark, { as: 'h1' }))).toMatch(/<h1 /);
  });
});
