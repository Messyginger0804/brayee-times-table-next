import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import BrayleeCheer from '../../braylee/BrayleeCheer';

export default function UnlockModal({ open, setOpen, onReset }) {
  const onClose = () => setOpen(false);
  const onStartTest = () => { setOpen(false); onReset(); };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Congratulations! 🎉🌟"
      actions={<>
        <Button tone="lime" size="lg" onClick={onStartTest}>Start Level 1 Test 🚀</Button>
        <Button tone="ghost" onClick={onClose}>Continue Practicing ✏️</Button>
      </>}
    >
      <BrayleeCheer moment="unlock" pose="levelUp" size={96} speak className="mb-3" />
      <p className="text-lead font-bold text-ink">You have unlocked the Level 1 Test!</p>
      <p>Amazing job completing all 25 problems! 💖 You&apos;re ready for your first official test.</p>
    </Modal>
  );
}
