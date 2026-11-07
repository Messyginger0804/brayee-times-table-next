import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import CredentialsForm from '../app/login/_components/CredentialsForm';
import SecretInput from '../components/ui/SecretInput';

const read = (f) => readFileSync(path.join(__dirname, '..', f), 'utf8');
const props = { name: '', setName() {}, pin: '', setPin() {}, error: '', loading: false, onSubmit() {}, onBack() {} };

describe('secret number fields must not look like credentials (password managers would offer to save the student ID)', () => {
  it('sign-in form: no password input, no username/password autocomplete tokens, opt-out attributes on both fields', () => {
    const html = renderToStaticMarkup(<CredentialsForm {...props} />);
    expect(html).not.toMatch(/type="password"/);
    expect(html).not.toMatch(/autoComplete="(username|current-password|new-password)"|autocomplete="(username|current-password|new-password)"/i);
    const inputs = html.match(/<input[^>]*>/g);
    expect(inputs).toHaveLength(2);
    for (const i of inputs) {
      expect(i).toMatch(/type="text"/);
      expect(i).toMatch(/autoComplete="off"|autocomplete="off"/i);
      expect(i).toMatch(/data-1p-ignore="true"/);
      expect(i).toMatch(/data-lpignore="true"/);
      expect(i).toMatch(/data-form-type="other"/);
      expect(i).not.toMatch(/name="(pin|password|pass|user|username|email)"/);
    }
    expect(html).toMatch(/<form[^>]*autoComplete="off"|<form[^>]*autocomplete="off"/i);
  });

  it('SecretInput: numeric keypad, digits only, CSS mask, capped length', () => {
    const html = renderToStaticMarkup(<SecretInput id="x" name="secret_number" value="12" onChange={() => {}} />);
    expect(html).toMatch(/inputMode="numeric"|inputmode="numeric"/i);
    expect(html).toMatch(/pattern="\\d\*"|pattern="\\d\*"/);
    expect(html).toMatch(/class="secret-mask /);
    expect(html).not.toMatch(/type="password"/);
    let got = null;
    SecretInput({ id: 'x', value: '', onChange: (v) => { got = v; } }).props.onChange({ target: { value: '12a3456' } });
    expect(got).toBe('12345');
  });

  it('the save form uses SecretInput (never type=password) and the mask rule exists', () => {
    const src = read('components/SaveCadet.jsx');
    expect(src).not.toMatch(/type[=:]\s*["']password["']/);
    expect(src.match(/<SecretInput/g)).toHaveLength(2);
    expect(src).toMatch(/autoComplete="off"/);
    expect(read('app/globals.css')).toMatch(/\.secret-mask\s*{[^}]*-webkit-text-security:\s*disc/);
    for (const f of ['components/SaveCadet.jsx', 'app/login/_components/CredentialsForm.jsx', 'components/ui/SecretInput.jsx']) {
      expect(read(f)).not.toMatch(/current-password|new-password|"username"/);
    }
  });
});
