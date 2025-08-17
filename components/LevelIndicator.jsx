"use client";
function LevelIndicator({ level }) {
  const badge = level >= 2 ? '👑' : '⭐️';
  return (
    <div className="absolute bottom-4 right-4 bg-pink-500 text-white text-2xl font-bold p-4 rounded-full">
      {badge} Level {level}
    </div>
  );
}

export default LevelIndicator;

