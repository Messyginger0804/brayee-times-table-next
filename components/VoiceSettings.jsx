"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Button from './ui/Button';
import { useCheerMuted } from '../lib/cheerVoice';
import {
  useVoices, useVoiceSettings, resolveVoice, voiceKey, friendlyName, speak, cancelSpeech,
  isSpeechAvailable, loadVoices, PREVIEW_TEXT, SPEED_MIN, SPEED_MAX,
} from '../lib/voice';

const FOCUSABLE = 'button, select, input, [href], [tabindex]:not([tabindex="-1"])';

/** Accessible dialog shell: focus moves in and is trapped, Esc and backdrop close, focus returns on close. */
function Dialog({ open, onClose, labelledBy, children }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    ref.current?.querySelector(FOCUSABLE)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
      const at = items.indexOf(document.activeElement);
      const wrapTo = e.shiftKey ? (at <= 0 ? items.length - 1 : -1) : (at === items.length - 1 ? 0 : -1);
      if (items.length && wrapTo >= 0) { e.preventDefault(); items[wrapTo].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  const t = reduced ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 26 };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-space-950/70 p-4 pb-safe sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduced ? { duration: 0 } : undefined}
          onClick={onClose}
        >
          <motion.div
            ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
            onClick={(e) => e.stopPropagation()}
            initial={reduced ? false : { y: 60, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }} transition={t}
            className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-bubble bg-space-800/95 p-6 shadow-glow-violet"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VoiceForm({ onClose, titleId }) {
  const [cfg, update] = useVoiceSettings();
  const voices = useVoices();
  const [muted] = useCheerMuted();
  const [note, setNote] = useState('');
  const speedId = useId();
  const selectId = useId();
  const current = resolveVoice(voices, cfg);

  useEffect(() => () => cancelSpeech(), []);

  const tryIt = () => {
    if (muted) { setNote("Braylee's voice is off. Tap the 🔊 button to turn it on."); return; }
    setNote('');
    cancelSpeech();
    if (!speak(PREVIEW_TEXT)) setNote("This device can't talk right now, but you can read it here!");
  };

  return (
    <>
      <h2 id={titleId} className="mb-1 text-center text-title text-neon-amber">Braylee&apos;s Voice</h2>
      <p className="mb-4 text-center text-body text-ink-dim">Pick how Braylee sounds.</p>
      <div className="flex flex-col gap-4 text-left">
        {voices.length > 0 && (
          <div>
            <label htmlFor={selectId} className="mb-1 block text-body font-bold">Voice</label>
            <select
              id={selectId} value={current ? voiceKey(current) : ''}
              onChange={(e) => update({ voiceURI: e.target.value })}
              className="glass min-h-[3rem] w-full rounded-chunk bg-space-900 px-3 text-lead text-ink"
            >
              {voices.map((v) => <option key={voiceKey(v)} value={voiceKey(v)}>{friendlyName(v)}</option>)}
            </select>
          </div>
        )}
        <div className="flex min-h-[3rem] items-center justify-between gap-3">
          <span id={`${titleId}-kid`} className="text-body font-bold">Kid voice</span>
          <button
            type="button" role="switch" aria-checked={cfg.kid} aria-labelledby={`${titleId}-kid`}
            onClick={() => update({ kid: !cfg.kid })}
            className={`relative h-12 w-20 shrink-0 rounded-full border-2 border-white/30 transition-colors ${cfg.kid ? 'bg-neon-lime' : 'bg-space-700'}`}
          >
            <span aria-hidden="true" className={`absolute top-1 h-9 w-9 rounded-full bg-white shadow transition-all ${cfg.kid ? 'left-[2.5rem]' : 'left-1'}`} />
            <span className="sr-only">{cfg.kid ? 'On' : 'Off'}</span>
          </button>
        </div>
        <div>
          <label htmlFor={speedId} className="mb-1 flex justify-between text-body font-bold">
            <span>Speed</span><span className="text-ink-dim" aria-hidden="true">🐢 &nbsp; 🐇</span>
          </label>
          <input
            id={speedId} type="range" min={SPEED_MIN} max={SPEED_MAX} step="0.05" value={cfg.speed}
            onChange={(e) => update({ speed: Number(e.target.value) })}
            aria-valuetext={`${cfg.speed.toFixed(2)} times normal speed`}
            className="h-12 w-full accent-neon-cyan"
          />
        </div>
        <Button tone="lime" size="lg" className="w-full" onClick={tryIt}>
          <span aria-hidden="true">▶️</span> Try it
        </Button>
        <p className="text-center text-body text-ink-dim">&ldquo;{PREVIEW_TEXT}&rdquo;</p>
        <p role="status" className="min-h-[1.5rem] text-center text-body text-neon-amber">{note}</p>
        {voices.length === 0 && <p className="text-center text-body text-ink-dim">This device uses its standard voice.</p>}
        <Button tone="ghost" onClick={onClose} className="w-full">Done</Button>
      </div>
    </>
  );
}

/** Header "Voice" button + settings dialog. Renders nothing when the browser has no speech at all. */
export default function VoiceSettings() {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(false);
  const titleId = useId();
  useEffect(() => { setSupported(isSpeechAvailable()); loadVoices(); }, []);
  if (!supported) return null;
  return (
    <>
      <Button tone="ghost" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Voice settings" title="Voice settings">
        <span aria-hidden="true">⚙️</span> Voice
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <VoiceForm onClose={() => setOpen(false)} titleId={titleId} />
      </Dialog>
    </>
  );
}
