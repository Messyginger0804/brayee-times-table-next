"use client";
import { motion } from 'framer-motion';

/** Page/screen wrapper: safe-area padding, no horizontal overflow, enter/exit transition. */
export default function Screen({ children, className = '', ...rest }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-safe pt-safe pb-safe ${className}`}
      {...rest}
    >
      {children}
    </motion.main>
  );
}

export function GlassCard({ children, className = '', ...rest }) {
  return (
    <div className={`glass rounded-bubble p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ${className}`} {...rest}>
      {children}
    </div>
  );
}
