export const NUMERIC_HINT = 'Tap some numbers first 👆';

export const isValidAnswer = (answer) => answer !== '' && /^\d+$/.test(answer);

export const isCorrectAnswer = (answer, card) => parseInt(answer, 10) === card.answer;

// Returns a new attemptSummaries map with this attempt prepended (keeps last 5).
export function addAttempt(summaries, card, isCorrect, now = new Date()) {
  const key = String(card.id);
  const prev = summaries[key] || { attempts: [], correctCount: 0, totalCount: 0 };
  const attempts = [
    { id: now.getTime(), problemId: card.id, isCorrect, createdAt: now.toISOString() },
    ...(prev.attempts || []),
  ].slice(0, 5);
  return {
    ...summaries,
    [key]: { attempts, correctCount: attempts.filter((a) => a.isCorrect).length, totalCount: attempts.length },
  };
}

// Practice progress after a correct answer: new progress map + whether this answer completed the set.
export function progressAfterCorrect(card, problems, userProgress) {
  const nextProgress = { ...userProgress, [card.id]: true };
  const isNew = !userProgress[card.id];
  const setComplete = isNew && problems.length > 0 && problems.every((p) => nextProgress[p.id]);
  return { nextProgress, setComplete };
}

// Original rule: the unlock dialog is for the 25-problem level set, shown once.
export const shouldOfferUnlock = ({ scoped, alreadyShown, count }) => !scoped && !alreadyShown && count === 25;
