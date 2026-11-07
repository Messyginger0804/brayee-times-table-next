"use client";
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useScenePopup } from '../../lib/sceneFx';
import { useMomentClaim } from '../../lib/momentDirector';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible dialog: focus moves in, Esc closes, backdrop tap closes. */
export default function Modal({ open, onClose, title, children, actions }) {
  const ref = useRef(null);
  useScenePopup(open);
  useMomentClaim('modal', open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Keyed on `open` only: callers pass fresh onClose closures every render and
  // must not re-grab focus.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const focusables = () => [...(ref.current?.querySelectorAll(FOCUSABLE) || [])];
    (focusables()[0] || ref.current)?.focus?.();
    // Everything else in <body> is inert while the (portaled) dialog is open.
    const hidden = [...document.body.children].filter((n) => !n.hasAttribute('data-modal-root') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName)).map((n) => {
      const was = { n, inert: n.inert, aria: n.getAttribute('aria-hidden') };
      n.inert = true; n.setAttribute('aria-hidden', 'true');
      return was;
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { onCloseRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0], last = els[els.length - 1];
      const active = document.activeElement;
      if (!ref.current?.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      for (const { n, inert, aria } of hidden) {
        n.inert = inert;
        if (aria === null) n.removeAttribute('aria-hidden'); else n.setAttribute('aria-hidden', aria);
      }
      prev?.focus?.();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div data-modal-root>
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-space-950/70 p-4 pb-safe sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={ref}
            role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
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
    </div>,
    document.body
  );
}
