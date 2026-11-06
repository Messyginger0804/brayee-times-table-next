"use client";
/** Small level chip (inline, no absolute positioning so it never overlaps controls on phones). */
function LevelIndicator({ level, className = '' }) {
  const badge = level >= 2 ? '👑' : '⭐️';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-neon-pink/60 bg-space-800/80 px-3 py-1 text-body font-bold text-neon-pink shadow-glow-pink ${className}`}>
      <span aria-hidden="true">{badge}</span> Level {level}
    </span>
  );
}

export default LevelIndicator;
