import Header from '../../Header';
import Screen, { GlassCard } from '../../ui/Screen';
import Button from '../../ui/Button';

export default function NoProblemsScreen({ user, onReset }) {
  return (
    <Screen>
      <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
      <div className="flex flex-1 items-center justify-center">
        <GlassCard className="text-center">
          <h1 className="mb-2 text-title text-neon-pink">No Problems Yet</h1>
          <p className="mb-5 text-body text-ink-dim">There aren&apos;t any problems available for this level right now.</p>
          <Button tone="violet" onClick={onReset}>Back to Main Menu</Button>
        </GlassCard>
      </div>
    </Screen>
  );
}
