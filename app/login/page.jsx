"use client";
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Screen, { GlassCard } from '../../components/ui/Screen';
import BrandBadge from '../../components/braylee/BrandBadge';
import HostAstronaut from '../../components/game/HostAstronaut';
import GuestButtons from './_components/GuestButtons';
import CredentialsForm from './_components/CredentialsForm';
import ShakeError from './_components/ShakeError';
import SignedInCard from './_components/SignedInCard';
import useLogin from './_components/useLogin';

export default function LoginPage() {
  const { data: session } = useSession();
  const login = useLogin();

  if (session?.user) return <SignedInCard />;

  const { error, showLogin, done } = login;
  return (
    <Screen className="items-center justify-center">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full max-w-sm"
      >
        <div className="mb-4 text-center">
          <BrandBadge as="h1" className="mb-4" />
          <HostAstronaut size={150} className="mb-3" />
          <p className="mt-1 text-lead text-ink-dim">Ready for blast off?</p>
        </div>

        <GlassCard>
          <div className="flex flex-col gap-3">
            <GuestButtons resume={login.resume} loading={login.loading} onEnter={login.enterGuest} />

            <div aria-live="polite" className="min-h-[1.5rem] text-center">
              {!showLogin && <ShakeError error={error} />}
              {done && <p className="text-body font-bold text-neon-lime">{done}</p>}
            </div>

            {showLogin ? (
              <CredentialsForm name={login.name} pin={login.pin} setName={login.setName} setPin={login.setPin}
                error={error} loading={login.loading} onSubmit={login.handleLogin} />
            ) : (
              <button type="button" className="min-h-[3rem] text-body text-neon-cyan underline underline-offset-4"
                onClick={login.openLogin}>
                Log in
              </button>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </Screen>
  );
}
