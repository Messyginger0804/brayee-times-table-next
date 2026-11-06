"use client";
import { useParams } from 'next/navigation';
import SkillMode from '../../../components/SkillMode';

export default function SkillPage() {
  const { id } = useParams();
  return <SkillMode skillId={decodeURIComponent(String(id || ''))} />;
}
