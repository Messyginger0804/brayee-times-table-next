import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CredentialsForm from '../app/login/_components/CredentialsForm';

describe('sign-in form wording', () => {
  const html = renderToStaticMarkup(<CredentialsForm name="" setName={() => {}} pin="" setPin={() => {}} error="" loading={false} onSubmit={() => {}} onBack={() => {}} />);
  it('asks for the name and the Student ID, with the lunch hint', () => {
    expect(html).toContain('>Your cadet name<');
    expect(html).toContain('>Student ID<');
    expect(html).toContain('The 5–8 digit number you use for lunch at school');
    expect(html).toContain('maxLength="8"');
    expect(html).toContain('pattern="\\d{5,8}"');
  });
  it('never says secret number', () => {
    expect(html.toLowerCase()).not.toContain('secret number');
  });
});
