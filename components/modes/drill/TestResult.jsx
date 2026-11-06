import Header from '../../Header';
import Screen from '../../ui/Screen';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';

export default function TestResult({ user, onReset, onRetry, passed, score, passOpen, setPassOpen, passedLevel }) {
  const onClosePass = () => setPassOpen(false);
  const level1 = passedLevel === 1;
  return (
    <Screen>
      <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div aria-hidden="true" className="text-jumbo">{passed ? '🏆' : '🌠'}</div>
        <h1 className="text-hero text-neon-pink">{passed ? 'Mission Complete!' : 'Game Over'}</h1>
        <p className="text-lead">Your final score is <strong className="text-neon-lime">{score}</strong></p>
        <Button tone="pink" size="lg" onClick={onRetry}>Try Again 🔁</Button>
        <Button tone="ghost" onClick={onReset}>Back to Main Menu</Button>
      </div>
      <Modal
        open={passOpen}
        onClose={onClosePass}
        title={level1 ? 'You passed Level 1! 🎉' : 'Perfect score! 🎉'}
        actions={<Button tone="lime" size="lg" onClick={onClosePass}>Awesome! ✨</Button>}
      >
        <p>{level1 ? 'Level 2 is unlocked. Great job, space cadet! 💖' : 'Every answer was right. Amazing! 💖'}</p>
      </Modal>
    </Screen>
  );
}
