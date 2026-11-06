import axios from 'axios';

export const gradeLabel = (g) => ({ 1: '1st', 2: '2nd', 3: '3rd' }[g] || `${g}th`);

/** First load sends no params (server picks the kid's grade); after that the picker drives the query. */
export function buildWordParams(isFirstLoad, grade, tier, unit) {
  if (isFirstLoad || !grade) return {};
  const params = { grade };
  if (tier) params.tier = tier;
  if (unit) params.unit = unit;
  return params;
}

export function normalizeWordsResponse(data) {
  return {
    words: Array.isArray(data?.words) ? data.words : [],
    grade: Number.isInteger(data?.grade) ? data.grade : null,
  };
}

/** Words come from the API, which falls back to the bundled list when the table is empty; so do we if the API is down. */
export function loadWords(params) {
  return axios.get('/api/spelling/words', { params })
    .then((r) => normalizeWordsResponse(r.data))
    .catch(() => import('../../../lib/spellingWords.json').then((m) => ({ words: m.default, grade: null })));
}

export function hiddenSentence(sentence, word) {
  if (!sentence || !word) return '';
  return sentence.replace(new RegExp(`\\b${word}\\b`, 'gi'), '_____');
}

export const isCorrectSpelling = (answer, word) => answer.trim().toLowerCase() === word.toLowerCase();

export const spellingPauseMs = (isCorrect) => (isCorrect ? 1400 : 2600);

export const pickRandom = (list, rand = Math.random) => list[Math.floor(rand() * list.length)];

export function speakWord(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}
