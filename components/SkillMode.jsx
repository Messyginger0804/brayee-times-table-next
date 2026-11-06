"use client";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useFeedback } from './gif/GifProvider';
import { CenterScreen, SignInCard } from './modes/shared/GateViews';
import { SkillBlocked, SkillPlay } from './modes/shared/SkillView';
import { useAuthUser } from './modes/shared/useAuthUser';
import { useSkillLoader } from './modes/shared/useSkillLoader';
import { useSkillGame } from './modes/shared/useSkillGame';
import { isPlayable, skillTitle } from './modes/shared/skillLogic';

export default function SkillMode({ skillId }) {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const feedback = useFeedback();
  const [user] = useAuthUser(authStatus);
  const { skill, levelIndex, setLevelIndex, prog, setProg, levelRef } = useSkillLoader(user, skillId);
  const game = useSkillGame({ skillId, skill, feedback, levelRef, setProg, setLevelIndex });

  if (authStatus === 'loading' || (user && skill === undefined)) {
    return <CenterScreen><p role="status" className="text-title text-neon-cyan">Loading mission… 🚀</p></CenterScreen>;
  }
  if (!user) return <CenterScreen><SignInCard /></CenterScreen>;
  const goHome = () => router.push('/');
  if (!isPlayable(skill)) return <CenterScreen><SkillBlocked skill={skill} onBack={goHome} /></CenterScreen>;

  return <SkillPlay skill={skill} user={user} game={game} levelIndex={levelIndex} prog={prog} title={skillTitle(skill.name)} onBack={goHome} />;
}
