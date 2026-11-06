"use client";
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import Header from './Header';
import Screen from './ui/Screen';
import GameHud from './game/GameHud';
import { useFeedback, GifSlot } from './gif/GifProvider';
import { CenterScreen } from './modes/shared/GateViews';
import { StartPanel, RoundPanel } from './modes/shared/SpellingViews';
import { useAuthUser, useLoginRedirect } from './modes/shared/useAuthUser';
import { useSpellingWords } from './modes/shared/useSpellingWords';
import { useSpellingRound } from './modes/shared/useSpellingRound';

function SpellingBeeMode() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const feedback = useFeedback();
  const [user] = useAuthUser(authStatus);
  useLoginRedirect(authStatus);
  const loading = authStatus === 'loading';

  useEffect(() => {
    if (user) feedback.startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  // Words come from the DB via the API (the API falls back to lib/spellingWords.json when the table is empty).
  const { wordsReady, myGrade, pick, setPick, wordsRef } = useSpellingWords();
  const round = useSpellingRound({ wordsRef, feedback });

  if (loading || !user) {
    return <CenterScreen><p role="status" className="text-title text-neon-amber">Loading… 🐝</p></CenterScreen>;
  }

  return (
    <Screen>
      <Header onReset={() => router.push('/')} userName={user?.name} userImage={user?.image} />
      <h1 className="text-center text-title text-neon-amber text-glow">Spelling Bee 🐝</h1>
      <GameHud streak={round.streak} score={round.stars} />
      <GifSlot />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:pt-4">
        {round.currentWordData ? (
          <AnimatePresence mode="wait" initial={false}>
            <RoundPanel key={round.currentWordData.word} round={round} myGrade={myGrade} />
          </AnimatePresence>
        ) : (
          <StartPanel myGrade={myGrade} pick={pick} setPick={setPick} wordsReady={wordsReady}
            wordCount={wordsRef.current.length} onStart={round.startRound} />
        )}
      </div>
    </Screen>
  );
}

export default SpellingBeeMode;
