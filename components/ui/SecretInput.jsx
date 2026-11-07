"use client";

/**
 * Masked digits input for a secret number (student ID / Braylee's PIN) that password managers and browsers ignore.
 * Deliberately NOT type="password" (browsers would offer to save it, and a shared device would then autofill it for the next child):
 * a text input with a CSS mask (.secret-mask, globals.css), a non-credential name/id, and the opt-out attributes the common managers read.
 */
export default function SecretInput({ id, name, value, onChange, maxLength = 5, pattern = '\\d*', className = '', ...rest }) {
  const hint = `${id}-hint`;
  return (
    <>
    <input
      id={id} name={name} type="text" inputMode="numeric" pattern={pattern} maxLength={maxLength} value={value}
      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
      data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))}
      className={`secret-mask ${className}`}
      aria-describedby={hint}
      {...rest}
    />
    <span id={hint} className="sr-only">Secure entry. Numbers only. What you type is hidden.</span>
    </>
  );
}
