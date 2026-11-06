"use client";
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** Accessible dialog: focus moves in, Esc closes, backdrop tap closes. */
export default function Modal({ open, onClose, title, children, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const first = ref.current?.querySelector('button');
    first?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-space-950/70 p-4 pb-safe sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={ref}
            role="dialog" aria-modal="true" aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="glass w-full max-w-md rounded-bubble bg-space-800/95 p-6 text-center shadow-glow-violet"
          >
            <h2 className="mb-2 text-title text-neon-amber">{title}</h2>
            <div className="mb-5 text-body text-ink-dim">{children}</div>
            <div className="flex flex-col gap-3">{actions}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
