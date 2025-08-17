"use client";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import LevelIndicator from './LevelIndicator';
import Header from './Header';
import { getRandomCelebrateGif, getRandomUpsetGif } from '../lib/gifSelector';
import { emoji } from '../lib/emoji';
import { triggerFireworks } from '../lib/fireworks';
import axios from 'axios';

function PracticeMode({ problems, level, onReset, attemptSummaries = {}, setAttemptSummaries, userProgress = {}, setUserProgress }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [last5, setLast5] = useState({ correctCount: 0, totalCount: 0 });
  const [showStats, setShowStats] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [lastAttemptCorrect, setLastAttemptCorrect] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showStreakToast, setShowStreakToast] = useState(false);
  const [streakToastCount, setStreakToastCount] = useState(0);

  const handleCardClick = () => setIsFlipped(!isFlipped);
  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setUserAnswer('');
      const nextIndex = (currentCardIndex + 1) % problems.length;
      setCurrentCardIndex(nextIndex);
      setShowStats(false);
      setShowEncouragement(false);
    }, 500);
  };

  const fetchLast5 = async (problemId) => {
    const key = String(problemId);
    const summary = attemptSummaries[key];
    if (summary) {
      setLast5({ correctCount: summary.correctCount || 0, totalCount: summary.totalCount || (summary.attempts?.length || 0) });
      const last = Array.isArray(summary.attempts) && summary.attempts.length > 0 ? !!summary.attempts[0].isCorrect : null;
      setLastAttemptCorrect(last);
      return;
    }
    try {
      const res = await axios.get(`/api/problems/${problemId}/last5`, { withCredentials: true });
      const data = res.data;
      setLast5({ correctCount: data.correctCount || 0, totalCount: data.totalCount || 0 });
      const last = Array.isArray(data.attempts) && data.attempts.length > 0 ? !!data.attempts[0].isCorrect : null;
      setLastAttemptCorrect(last);
    } catch (_) {
      setLast5({ correctCount: 0, totalCount: 0 });
      setLastAttemptCorrect(null);
    }
  };

  useEffect(() => {
    const current = problems[currentCardIndex];
    if (current) fetchLast5(current.id);
  }, [currentCardIndex, problems]);

  useEffect(() => {
    setShowStats(false);
    setShowEncouragement(false);
    let id1, id2;
    if (!isFlipped) {
      id1 = setTimeout(() => setShowStats(true), 1500);
      id2 = setTimeout(() => setShowEncouragement(true), 3500);
    }
    return () => { if (id1) clearTimeout(id1); if (id2) clearTimeout(id2); };
  }, [isFlipped, currentCardIndex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userAnswer === '' || !/^\d+$/.test(String(userAnswer))) {
      try {
        await Swal.fire({
          icon: 'warning',
          title: 'Enter a number',
          text: 'Please type a number before submitting.',
          confirmButtonColor: '#a855f7',
        });
      } catch (_) {}
    
      return;
    }
    const currentCard = problems[currentCardIndex];
    const isCorrect = parseInt(userAnswer, 10) === currentCard.answer;

    setIsFlipped(true);
    setTimeout(async () => {
      if (isCorrect) {
        const nextStreak = streak + 1;
        try {
          if (nextStreak % 5 === 0) {
            triggerFireworks({ duration: 2200, particles: 260 });
            setStreakToastCount(nextStreak);
            setShowStreakToast(true);
            setTimeout(() => setShowStreakToast(false), 2200);
          } else {
            triggerFireworks({ duration: 1200, particles: 150 });
          }
        } catch (_) {}
        setStreak(nextStreak);
        await axios.post(`/api/problems/${currentCard.id}/attempt`, { correct: true }, { withCredentials: true });
        await Swal.fire({
          title: `Correct! ${emoji.party()}${emoji.heart()}`,
          imageUrl: getRandomCelebrateGif(),
          imageAlt: 'Celebrate',
          showConfirmButton: false,
          timer: 3000,
          background: 'transparent',
        });
        await axios.post(`/api/problems/${currentCard.id}/mastered`);
        if (setUserProgress) setUserProgress({ ...userProgress, [currentCard.id]: true });
      } else {
        setStreak(0);
        await axios.post(`/api/problems/${currentCard.id}/attempt`, { correct: false }, { withCredentials: true });
        await Swal.fire({
          title: `Incorrect ${emoji.encourage()}`,
          text: `The correct answer is ${currentCard.answer}. You got this! ${emoji.heart()}`,
          imageUrl: getRandomUpsetGif(),
          imageAlt: 'Try again',
          showConfirmButton: false,
          timer: 3000,
          background: 'transparent',
        });
      }
      setUserAnswer('');
      const key = String(currentCard.id);
      const prev = attemptSummaries[key] || { attempts: [], correctCount: 0, totalCount: 0 };
      const newAttempt = { id: Date.now(), problemId: currentCard.id, isCorrect, createdAt: new Date().toISOString() };
      const newAttempts = [newAttempt, ...(prev.attempts || [])].slice(0, 5);
      const newCorrect = newAttempts.filter(a => a.isCorrect).length;
      const nextSummary = { attempts: newAttempts, correctCount: newCorrect, totalCount: newAttempts.length };
      if (setAttemptSummaries) setAttemptSummaries({ ...attemptSummaries, [key]: nextSummary });
      fetchLast5(currentCard.id);
      handleNextCard();
    }, 1000);
  };

  if (problems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 relative">
        <Header onReset={onReset} />
        <div className="flex flex-col items-center justify-center text-center p-8">
          <h1 className="text-4xl md:text-6xl font-gochi-hand text-pink-500 mb-4">No Problems Yet</h1>
          <p className="text-lg text-gray-700 mb-6">There aren’t any problems available for this level right now.</p>
          <button onClick={onReset} className="px-6 py-3 md:px-8 md:py-4 text-xl md:text-2xl rounded-lg cursor-pointer bg-purple-400 text-white border-none hover:bg-purple-500">Back to Main Menu</button>
        </div>
      </div>
    );
  }

  const currentCard = problems[currentCardIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 relative">
      <Header onReset={onReset} />
      <div className="flex flex-col items-center justify-center text-center p-4 relative">
        {showStreakToast && (
          <div className="absolute top-24 right-4 z-50 bg-pink-500 text-white text-lg md:text-xl font-bold px-4 py-2 rounded-full shadow-lg pop-in">
            🔥 {streakToastCount} in a row! 🎉
          </div>
        )}
        <LevelIndicator level={level} />
        <h1 className="text-4xl md:text-6xl font-gochi-hand text-pink-500 mb-8">Practice Mode ✏️✨</h1>
        <div className="w-full md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6">
          {showStats && last5.totalCount > 0 && last5.correctCount > 0 && (
            <div className="hidden md:block md:col-start-1 md:justify-self-center text-lg text-gray-700 wave-in max-w-xs text-left">
              You have answered this right {last5.correctCount} out of the last {Math.min(5, last5.totalCount || 0)} times. {emoji.heart()}
            </div>
          )}
          <div className="w-64 h-40 md:w-72 md:h-48 [perspective:1000px] cursor-pointer mb-4 md:mb-0 md:col-start-2 md:justify-self-center" onClick={handleCardClick}>
            <div className={`relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d] shadow-lg ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              <div className="absolute w-full h-full backface-hidden flex items-center justify-center text-3xl md:text-4xl rounded-lg bg-teal-300 text-white">
                <p>{currentCard.problem}</p>
              </div>
              <div className="absolute w-full h-full backface-hidden flex items-center justify-center text-3xl md:text-4xl rounded-lg bg-green-500 text-white [transform:rotateY(180deg)]">
                <p>{currentCard.answer}</p>
              </div>
            </div>
          </div>
          {showEncouragement && last5.totalCount > 0 && (
            <div className="hidden md:block md:col-start-3 md:justify-self-center text-lg text-gray-700 wave-in max-w-xs text-left">
              {lastAttemptCorrect === true
                ? <>You answered this right last time — you got this! ✅ {emoji.heart()} {emoji.party()}</>
                : lastAttemptCorrect === false
                ? <>Last time was tricky — you got this! {emoji.encourage()} {emoji.heart()}</>
                : ''}
            </div>
          )}
        </div>
        {(showStats || showEncouragement) && last5.totalCount > 0 && (
          <div className="md:hidden w-full">
            {showStats && last5.correctCount > 0 && (
              <div className="mb-4 text-lg text-gray-700 wave-in">
                You have answered this right {last5.correctCount} out of the last {Math.min(5, last5.totalCount || 0)} times. {emoji.heart()}
              </div>
            )}
            {showEncouragement && (
              <div className="mb-4 text-lg text-gray-700 wave-in">
                {lastAttemptCorrect === true
                  ? <>You answered this right last time — you got this! ✅ {emoji.heart()} {emoji.party()}</>
                  : lastAttemptCorrect === false
                  ? <>Last time was tricky — you got this! {emoji.encourage()} {emoji.heart()}</>
                  : ''}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <input
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="px-4 py-2 rounded border text-xl"
            placeholder="Type your answer"
            required
            min={0}
            step={1}
            inputMode="numeric"
          />
          <button type="submit" className="ml-3 px-6 py-3 text-xl rounded-lg cursor-pointer bg-teal-400 text-white border-none hover:bg-teal-500">Submit</button>
        </form>
        <button onClick={onReset} className="mt-6 px-6 py-3 text-xl rounded-lg cursor-pointer bg-purple-400 text-white border-none hover:bg-purple-500">Back to Main Menu</button>
      </div>
    </div>
  );
}

export default PracticeMode;
