"use client";
import { motion } from 'framer-motion';

// Re-mounts on every route change, giving a soft fade/slide between pages (login -> home -> spelling bee).
export default function Template({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
