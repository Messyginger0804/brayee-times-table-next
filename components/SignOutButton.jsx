"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { logout } from '../lib/signOut';

/** Always-visible Sign out. Guests (session carries the seat key) confirm first; Braylee signs out right away. */
export default function SignOutButton() {
  const { data } = useSession();
  const isGuest = !!data?.user?.gk;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); await logout(); };
  return (
    <>
      <Button tone="ghost" size="sm" disabled={busy} onClick={isGuest ? () => setConfirming(true) : go} className="!min-h-[48px]">
        <span aria-hidden="true">👋</span> Sign out
      </Button>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Sign out?"
        actions={(
          <>
            <Button tone="coral" size="lg" disabled={busy} onClick={go}>Sign out</Button>
            <Button tone="ghost" className="!min-h-[48px]" onClick={() => setConfirming(false)}>Stay</Button>
          </>
        )}
      >
        Your cadet seat stays saved on this device for 7 days.
      </Modal>
    </>
  );
}
