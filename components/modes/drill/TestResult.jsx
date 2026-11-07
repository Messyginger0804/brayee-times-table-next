import Header from '../../Header';
import Screen from '../../ui/Screen';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import BrayleeCheer from '../../braylee/BrayleeCheer';

export default function TestResult({ user, onReset, onRetry, passed, score, passOpen, setPassOpen, passedLevel, levelSaved = true, onRetrySave }) {
  const onClosePass = () => setPassOpen(false);
  const level1 = passedLevel === 1;
  const unsaved = level1 && !levelSaved;
  return (
    <Screen>
      <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <BrayleeCheer
          moment={passed ? 'testPass' : 'gameOver'}
          pose={passed ? 'levelUp' : 'tryAgain'}
          size={140}
          speak
        />
        <div aria-hidden="true" className="text-number">{passed ? '🏆' : '🌠'}</div>
        <h1 className="text-hero text-neon-pink">{passed ? 'Mission Complete!' : 'Game Over'}</h1>
        <p className="text-lead">Your final score is <strong className="text-neon-lime">{score}</strong></p>
        {!passed && <p className="text-body text-ink-dim">Every try makes you stronger. Let&apos;s go again! 💪</p>}
        <Button tone="pink" size="lg" onClick={onRetry}>Try Again 🔁</Button>
        <Button tone="ghost" onClick={onReset}>Back to Main Menu</Button>
      </div>
      <Modal
        open={passOpen}
        onClose={onClosePass}
        title={level1 ? 'You passed Level 1! 🎉' : 'Perfect score! 🎉'}
        actions={unsaved
          ? <><Button tone="lime" size="lg" onClick={onRetrySave}>Try saving again 🔁</Button><Button tone="ghost" onClick={onClosePass}>Not now</Button></>
          : <Button tone="lime" size="lg" onClick={onClosePass}>Awesome! ✨</Button>}
      >
        <p>{unsaved ? "Mission Control couldn't save that. Let's try again!" : level1 ? 'Level 2 is unlocked. Great job, space cadet! 💖' : 'Every answer was right. Amazing! 💖'}</p>
      </Modal>
    </Screen>
  );
}
