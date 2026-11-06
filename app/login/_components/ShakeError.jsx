"use client";
import { motion } from 'framer-motion';

export default function ShakeError({ error }) {
  if (!error) return null;
  return (
    <motion.p role="alert" initial={{ x: 0 }} animate={{ x: [0, -6, 6, -4, 4, 0] }} transition={{ duration: 0.4 }}
      className="text-body font-bold text-neon-coral">{error}</motion.p>
  );
}
