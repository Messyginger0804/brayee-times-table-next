"use client";
import Button from '../../../components/ui/Button';

export default function GuestButtons({ resume, loading, onEnter }) {
  if (!resume) {
    return (
      <Button tone="lime" size="lg" disabled={loading} onClick={() => onEnter('new')}
        className="min-h-[5rem] w-full text-title">
        🚀 Play as Guest
      </Button>
    );
  }
  return (
    <>
      <Button tone="lime" size="lg" disabled={loading} onClick={() => onEnter('resume')}
        className="min-h-[5rem] w-full text-title">
        🚀 Continue as Cadet {resume.label}
      </Button>
      <Button tone="ghost" disabled={loading} onClick={() => onEnter('new')} className="w-full">
        ✨ New guest
      </Button>
    </>
  );
}
