// Braylee's cheers: short, upbeat, first-person lines (about 2-6 words, at most one emoji).
// Moments: session, correct, streak ({n}), levelUp, mastered, wrong, testPass, gameOver, spellingCorrect,
// spellingWrong, unlock, locked, mapNudge, idle, welcomeGuest, welcomeBack ({name}).
// Never shaming: `wrong`, `spellingWrong`, `gameOver` and `locked` always encourage.
export const BRAYLEE_LINES = {
  session: ["Let's play!", 'Ready? Set? Go! 🚀', "I'm so excited!", "Let's do this!", 'Blast off with me!', 'Time to play, Cadet!'],
  correct: ['Yes! You did it!', 'I knew it! ⭐', 'Woohoo!', 'Great job!', "That's right!", "You're so smart!", 'High five! ✋'],
  streak: ['{n} in a row! 🔥', '{n} straight! Wow!', "I'm cheering! {n}!", 'Unstoppable! {n}!', "{n}! You're on fire!", 'Go go go! {n}!'],
  levelUp: ['Level up! I knew it! 🏆', 'You did it, Cadet!', "I'm so proud! 🎉", 'Super star! Level up!', 'New level! Woohoo!', 'Mission complete! 🚀'],
  mastered: ["You're a master! 🌟", 'Mastered it! Amazing!', "I'm so proud of you!", 'Genius! Every one!', 'You totally got it! ⭐', 'Wow, a real expert!'],
  wrong: ['So close! Try again!', 'You got this! 💪', 'Almost! Keep going!', "That's okay! Again!", 'Shake it off, Cadet!', "I believe in you!", 'Try once more! 🚀'],
  testPass: ['You passed! Woohoo! 🎉', 'Test complete! Super!', "I'm so proud! 🏆", 'You aced it, Cadet!', 'Passed! High five! ✋', 'Smarty pants! 🌟'],
  gameOver: ['Great try, Cadet!', 'You did so well! 💫', 'Play again? I will too!', "That's okay! Next time!", 'Good game! 🚀', "Practice makes you super!"],
  spellingCorrect: ['Spelled it right! ⭐', 'Super speller!', 'Yes! Perfect spelling!', 'You spelled it!', 'Spelling star! 🌟', 'Woohoo, nice spelling!'],
  spellingWrong: ['So close! Try again!', "Spelling is tricky! 💪", 'Almost! Next word!', "You'll get it!", 'Good try, speller!', 'Keep spelling, Cadet!'],
  unlock: ['New mission unlocked! 🔓', 'Look, something new!', 'You unlocked it! 🚀', 'A new world! Woohoo!', 'Yay, new stuff!', 'You earned it! ⭐'],
  locked: ['Not yet! Keep going!', "Almost there! You'll see!", 'Practice to unlock! 💪', 'Soon! I know it!', "Let's unlock it together!", 'Keep playing, Cadet!'],
  mapNudge: ['Try this mission next! 🚀', 'Next stop is here!', 'Tap the glowing one!', "Let's go this way!", 'Pick a mission, Cadet!', 'I am ready! You?'],
  idle: ['I believe in you!', 'Ready when you are! 🚀', "You've got this!", "Let's play!", 'Go go go, Cadet!', "I'm cheering for you! 🌟"],
  welcomeGuest: ['Hi! I am Braylee! 👋', "Hi friend! Let's play!", 'Welcome, space explorer!', "I'm Braylee! Hi!", 'Yay, you came to play!', 'Hello, Cadet! 🚀'],
  welcomeBack: ['Hi {name}! Yay! 🚀', "Welcome back, {name}!", "{name}! Let's play!", 'I missed you, {name}!', 'Hello again, {name}! 🌟', "Ready, {name}? Let's go!"],
};

const fill = (line, n, name) => line.replace('{n}', n ?? '').replace('{name}', name ?? '');

/**
 * A random line for `moment`. `n` fills {n}, `name` fills {name}; lines needing a missing name are skipped.
 * `avoid` (a string or array of strings) is never returned unless it is the only option, so callers can
 * pass the last line shown to avoid immediate repeats. Unknown moments return ''. `rand` is injectable for tests.
 */
export function pickLine(moment, { n, name, avoid } = {}, rand = Math.random) {
  const pool = (BRAYLEE_LINES[moment] || []).filter((l) => name || !l.includes('{name}'));
  const lines = pool.map((l) => fill(l, n, name));
  if (!lines.length) return '';
  const skip = [].concat(avoid || []);
  const fresh = lines.filter((l) => !skip.includes(l));
  const from = fresh.length ? fresh : lines;
  return from[Math.floor(rand() * from.length)];
}
