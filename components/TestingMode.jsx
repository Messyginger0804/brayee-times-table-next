"use client";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import LevelIndicator from './LevelIndicator';
import Header from './Header';
import { getRandomCelebrateGif, getRandomUpsetGif } from '../lib/gifSelector';
import { emoji } from '../lib/emoji';
import { triggerFireworks } from '../lib/fireworks';
import axios from 'axios';

function TestingMode({ problems, level, onLevelUp, onReset, attemptSummaries = {}, setAttemptSummaries }) {
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [last5, setLast5] = useState({ correctCount: 0, totalCount: 0 });
  const [showStats, setShowStats] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [lastAttemptCorrect, setLastAttemptCorrect] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showStreakToast, setShowStreakToast] = useState(false);
  const [streakToastCount, setStreakToastCount] = useState(0);

  const restartGame = () => {
    setCurrentProblemIndex(0);
    setScore(0);
    setGameOver(false);
    setUserAnswer('');
    setIsFlipped(false);
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
    const current = problems[currentProblemIndex];
    if (current) fetchLast5(current.id);
  }, [currentProblemIndex, problems]);

  useEffect(() => {
    setShowStats(false);
    setShowEncouragement(false);
    let id1, id2;
    if (!isFlipped) {
      id1 = setTimeout(() => setShowStats(true), 1500);
      id2 = setTimeout(() => setShowEncouragement(true), 3500);
    }
    return () => { if (id1) clearTimeout(id1); if (id2) clearTimeout(id2); };
  }, [isFlipped, currentProblemIndex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentProblem = problems[currentProblemIndex];
    const isCorrect = parseInt(userAnswer) === currentProblem.answer;

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
            triggerFireworks({ duration: 1000, particles: 120 });
          }
        } catch (_) {}
        setStreak(nextStreak);
        await axios.post(`/api/problems/${currentProblem.id}/attempt`, { correct: true }, { withCredentials: true });
        setScore(score + 1);
        await Swal.fire({
          title: `Correct! ${emoji.party()}${emoji.heart()}`,
          imageUrl: getRandomCelebrateGif(),
          imageAlt: 'Celebrate',
          showConfirmButton: false,
          timer: 3000,
          background: 'transparent',
        });

        if (currentProblemIndex === problems.length - 1) {
          if (level === 1) {
            await onLevelUp();
            try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {}
            await Swal.fire({
              title: `Congratulations! You passed Level 1! ${emoji.party()}${emoji.heart()}`,
              imageUrl: getRandomCelebrateGif(),
              imageAlt: 'Celebrate',
              showConfirmButton: true,
            });
          } else {
            try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {}
            await Swal.fire({
              title: `Congratulations! Perfect score! ${emoji.party()}${emoji.heart()}`,
              imageUrl: getRandomCelebrateGif(),
              imageAlt: 'Celebrate',
              showConfirmButton: true,
            });
          }
          setGameOver(true);
        } else {
          setIsFlipped(false);
          setTimeout(() => setCurrentProblemIndex(currentProblemIndex + 1), 500);
        }
      } else {
        setStreak(0);
        await axios.post(`/api/problems/${currentProblem.id}/attempt`, { correct: false }, { withCredentials: true });
        await Swal.fire({
          title: `Game Over ${emoji.encourage()}`,
          text: `The correct answer was ${currentProblem.answer}. Your score is ${score}. Want to try again? ${emoji.retry()}`,
          imageUrl: getRandomUpsetGif(),
          imageAlt: 'Try again',
          showConfirmButton: false,
          timer: 3000,
          background: 'transparent',
        });
        setGameOver(true);
      }
      setUserAnswer('');
      const key = String(currentProblem.id);
      const prev = attemptSummaries[key] || { attempts: [], correctCount: 0, totalCount: 0 };
      const newAttempt = { id: Date.now(), problemId: currentProblem.id, isCorrect, createdAt: new Date().toISOString() };
      const newAttempts = [newAttempt, ...(prev.attempts || [])].slice(0, 5);
      const newCorrect = newAttempts.filter(a => a.isCorrect).length;
      const nextSummary = { attempts: newAttempts, correctCount: newCorrect, totalCount: newAttempts.length };
      if (setAttemptSummaries) setAttemptSummaries({ ...attemptSummaries, [key]: nextSummary });
      fetchLast5(currentProblem.id);
    }, 1000);
  };

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-yellow-100 relative">
        <Header onReset={onReset} />
        <div className="flex flex-col items-center justify-center text-center p-4">
          <LevelIndicator level={level} />
          <h1 className="text-4xl md:text-6xl font-gochi-hand text-pink-500 mb-8">Game Over</h1>
          <div className="text-2xl mb-4">Your final score is: {score}</div>
          <button onClick={restartGame} className="px-6 py-3 md:px-8 md:py-4 text-xl md:text-2xl rounded-lg cursor-pointer bg-pink-400 text-white border-none hover:bg-pink-500">Try Again {emoji.retry()}</button>
        </div>
      </div>
    );
  }

  const currentProblem = problems[currentProblemIndex];
  if (!currentProblem || problems.length === 0) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-yellow-100 relative">
      <Header onReset={onReset} />
      <div className="flex flex-col items-center justify-center text-center p-4 relative">
        {showStreakToast && (
          <div className="absolute top-24 right-4 z-50 bg-pink-500 text-white text-lg md:text-xl font-bold px-4 py-2 rounded-full shadow-lg pop-in">
            🔥 {streakToastCount} in a row! 🎉
          </div>
        )}
        <LevelIndicator level={level} />
        <h1 className="text-4xl md:text-6xl font-gochi-hand text-pink-500 mb-8">Testing Mode 🧪🌟</h1>
        <div className="text-2xl mb-4">Score: {score}</div>
        <div className="w-full md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6">
          {showStats && last5.totalCount > 0 && last5.correctCount > 0 && (
            <div className="hidden md:block md:col-start-1 md:justify-self-center text-lg text-gray-700 wave-in max-w-xs text-left">
              You have answered this right {last5.correctCount} out of the last {Math.min(5, last5.totalCount || 0)} times. {emoji.heart()}
            </div>
          )}
          <div className="w-64 h-40 md:w-72 md:h-48 [perspective:1000px] cursor-pointer mb-8 md:mb-0 md:col-start-2 md:justify-self-center">
            <div className={`relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d] shadow-lg ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              <div className="absolute w-full h-full backface-hidden flex items-center justify-center text-3xl md:text-4xl rounded-lg bg-teal-300 text-white">
                <p>{currentProblem.problem}</p>
              </div>
              <div className="absolute w-full h-full backface-hidden flex items-center justify-center text-3xl md:text-4xl rounded-lg bg-green-500 text-white [transform:rotateY(180deg)]">
                <p>{currentProblem.answer}</p>
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

        <form onSubmit={handleSubmit} className="mt-6">
          <input type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} className="px-4 py-2 rounded border text-xl" placeholder="Type your answer" />
          <button type="submit" className="ml-3 px-6 py-3 text-xl rounded-lg cursor-pointer bg-teal-400 text-white border-none hover:bg-teal-500">Submit</button>
        </form>
        <button onClick={onReset} className="mt-6 px-6 py-3 text-xl rounded-lg cursor-pointer bg-purple-400 text-white border-none hover:bg-purple-500">Back to Main Menu</button>
      </div>
    </div>
  );
}

export default TestingMode;

