"use client";
import { AnimatePresence, motion } from 'framer-motion';

/** Counter that pops when the value changes. */
export default function AnimatedNumber({ value, className = '' }) {
  return (
    <span className={`relative inline-block tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 10, scale: 0.6, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
