import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CredentialsForm from '../app/login/_components/CredentialsForm';
import { SaveForm } from '../components/SaveCadet';

describe('sign-in form wording', () => {
  const html = renderToStaticMarkup(<CredentialsForm name="" setName={() => {}} pin="" setPin={() => {}} error="" loading={false} onSubmit={() => {}} onBack={() => {}} />);
  it('asks for the name and the Student ID, with the lunch hint', () => {
    expect(html).toContain('>Your cadet name<');
    expect(html).toContain('>Student ID<');
    expect(html).toContain('The 7 digit number you use for lunch at school');
    expect(html).toContain('maxLength="7"');
    expect(html).toContain('pattern="\\d{7}"');
    expect(html).toContain('placeholder="•••••••"');
    expect(html).toContain('inputMode="numeric"');
  });
  it('never says secret number', () => {
    expect(html.toLowerCase()).not.toContain('secret number');
  });
});

describe('save form wording', () => {
  const html = renderToStaticMarkup(<SaveForm form={{ name: '', secret: '', confirm: '' }} setForm={() => {}} error="" onSubmit={() => {}} />);
  it('uses the shared name label, short ID label, helper and 7 digit hint', () => {
    expect(html).toContain('>Your cadet name<');
    expect(html).toContain('>Student ID<');
    expect(html).toContain('We scramble it so nobody can read it');
    expect(html).toContain('id="cadet-secret-help"');
    expect(html).toContain('aria-describedby="cadet-secret-help');
    expect(html).toContain('7 digit');
    expect(html).toContain('placeholder="•••••••"');
    expect(html).toContain('maxLength="7"');
  });
});
