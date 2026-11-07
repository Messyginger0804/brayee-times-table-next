"use client";
import { forwardRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const MotionLink = motion.create(Link);
const isInternal = (href, target) => typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && target !== '_blank';

const tones = {
  cyan: 'bg-neon-cyan shadow-btn-cyan',
  pink: 'bg-neon-pink shadow-btn-pink',
  lime: 'bg-neon-lime shadow-btn-lime',
  amber: 'bg-neon-amber shadow-btn-amber',
  violet: 'bg-neon-violet shadow-btn-violet',
  coral: 'bg-neon-coral shadow-btn-coral',
  ghost: 'glass text-ink',
};
const sizes = {
  md: 'min-h-[3rem] px-5 text-lead',
  lg: 'min-h-[3.75rem] px-6 text-lead',
  sm: 'min-h-[3rem] px-4 text-body',
};

/** Chunky rounded button with press feedback. Renders a real <button>, or an <a> via href. */
const Button = forwardRef(function Button(
  { tone = 'cyan', size = 'md', href, className = '', children, ...props }, ref
) {
  const text = tone === 'ghost' ? '' : 'text-space-950';
  const cls = `btn-chunk inline-flex items-center justify-center gap-2 rounded-chunk font-bold ${tones[tone]} ${text} ${sizes[size]} ${className}`;
  const Comp = href ? (isInternal(href, props.target) ? MotionLink : motion.a) : motion.button;
  return (
    <Comp
      ref={ref}
      href={href}
      whileTap={{ scale: 0.94, y: 2 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={cls}
      {...(href ? {} : { type: props.type || 'button' })}
      {...props}
    >
      {children}
    </Comp>
  );
});

export default Button;
