"use client";
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { specialToken, physicalSpecialKey } from './keypadRules';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Large on-screen number pad (thumb-friendly, 64px keys). Also accepts a physical keyboard so
 * desktop works too. Uses real <button>s; no native input so iOS never zooms or pops its keyboard.
 */
export default function Keypad({ value, onChange, onSubmit, disabled = false, maxLength = 3, submitLabel = 'Go', extras = null }) {
  // `extras` = the problem's keypad flags from lib/curriculum ({ minus, decimal, fractionSlash, mixedSpace, remainder, maxDigits }).
  // Only the keys a problem needs are shown; with no extras this is the plain number pad used by Practice/Testing.
  const x = extras || {};
  const limit = extras ? (x.maxDigits || 7) + 6 : maxLength;
  const add = (t) => { if (!disabled && value.length < limit) onChange(value === '0' && /\d/.test(t) ? t : value + t); };
  const press = (d) => add(d);
  const back = () => { if (!disabled) onChange(value.slice(0, -1)); };
  const special = (k) => {
    if (disabled) return;
    const t = specialToken(k, value);
    if (t !== null) add(t);
  };
  const extraKeys = [
    x.minus && { k: '-', label: '−', name: 'Minus sign' },
    x.decimal && { k: '.', label: '.', name: 'Decimal point' },
    x.fractionSlash && { k: '/', label: '/', name: 'Fraction bar' },
    x.mixedSpace && { k: ' ', label: '␣', name: 'Space (for mixed numbers)' },
    x.remainder && { k: 'R', label: 'R', name: 'Remainder' },
  ].filter(Boolean);

  useEffect(() => {
    const onKey = (e) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.tagName === 'BUTTON') return; // the focused button handles Enter/Space itself
      if (/^\d$/.test(e.key)) press(e.key);
      else if (extras && physicalSpecialKey(e.key)) { e.preventDefault(); special(physicalSpecialKey(e.key)); }
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') onSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keyCls = 'btn-chunk touch-manipulation touch-target flex h-14 items-center justify-center rounded-chunk bg-space-700 text-number font-bold text-ink shadow-chunk border border-white/15 select-none';
  const tap = { scale: 0.92, y: 2 };

  return (
    <div role="group" aria-label="Number pad" className="grid w-full max-w-xs grid-cols-3 gap-2.5 sm:max-w-sm">
      {extraKeys.length > 0 && (
        <div className="col-span-3 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${extraKeys.length}, minmax(0, 1fr))` }}>
          {extraKeys.map((e) => (
            <motion.button key={e.name} type="button" disabled={disabled} whileTap={tap} aria-label={e.name} onClick={() => special(e.k)}
              className={`${keyCls} !h-12 !bg-space-800 text-neon-cyan`}>
              <span className="text-[2rem] leading-none">{e.label}</span>
            </motion.button>
          ))}
        </div>
      )}
      {KEYS.map((k) => (
        <motion.button key={k} type="button" disabled={disabled} whileTap={tap} className={keyCls} onClick={() => press(k)} aria-label={k}>
          <span className="text-[2rem] leading-none">{k}</span>
        </motion.button>
      ))}
      <motion.button type="button" disabled={disabled} whileTap={tap} className={`${keyCls} !bg-space-800 text-neon-coral`} onClick={back} aria-label="Delete last digit">
        <span className="text-[1.75rem] leading-none" aria-hidden="true">⌫</span>
      </motion.button>
      <motion.button type="button" disabled={disabled} whileTap={tap} className={keyCls} onClick={() => press('0')} aria-label="0">
        <span className="text-[2rem] leading-none">0</span>
      </motion.button>
      <motion.button type="button" disabled={disabled || value === ''} whileTap={tap} onClick={onSubmit}
        className="btn-chunk touch-manipulation touch-target flex h-14 items-center justify-center rounded-chunk bg-neon-lime text-space-950 font-bold shadow-btn-lime"
        aria-label={`Submit answer ${value}`}>
        <span className="text-lead">{submitLabel} ✓</span>
      </motion.button>
    </div>
  );
}
