"use client";
import { signOut } from 'next-auth/react';
import Screen, { GlassCard } from '../../../components/ui/Screen';
import Wordmark from '../../../components/braylee/Wordmark';
import Button from '../../../components/ui/Button';

export default function SignedInCard() {
  return (
    <Screen className="items-center justify-center">
      <Wordmark as="h1" className="mb-3" />
      <GlassCard className="w-full max-w-sm text-center">
        <p className="mb-4 text-lead">You are already signed in 🚀</p>
        <div className="flex flex-col gap-3">
          <Button tone="cyan" size="lg" href="/">Go play</Button>
          <Button tone="ghost" onClick={() => signOut({ callbackUrl: '/login' })}>Sign out</Button>
        </div>
      </GlassCard>
    </Screen>
  );
}
