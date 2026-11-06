"use client";
import { SessionProvider } from 'next-auth/react';
import { MotionConfig } from 'framer-motion';
import SpaceBackground from '../components/space/SpaceBackground';
import { GifProvider } from '../components/gif/GifProvider';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      {/* "user" = Framer Motion drops transform/layout animation when prefers-reduced-motion is on */}
      <MotionConfig reducedMotion="user">
        <SpaceBackground />
        <GifProvider>{children}</GifProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
