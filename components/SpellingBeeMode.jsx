"use client";
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Header from './Header';
import { getRandomCelebrateGif, getRandomUpsetGif } from '../lib/gifSelector';
import { emoji } from '../lib/emoji';
import { triggerFireworks } from '../lib/fireworks';

function SpellingBeeMode() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const loading = status === 'loading';

  const [word, setWord] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');

  const words = ["apple", "banana", "orange", "grape", "strawberry"]; // Hardcoded words for now

  // Load user details (level, image) when authenticated via NextAuth
  useEffect(() => {
    if (status === 'authenticated') {
      axios.get('/api/auth/me', { withCredentials: true })
        .then((r) => setUser(r.data || null))
        .catch(() => setUser(null));
    } else if (status === 'unauthenticated') {
      setUser(null);
    }
  }, [status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-green-200 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-gochi-hand text-white">Loading... 💖</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-green-200 flex flex-col items-center justify-center p-4">
        <div className="p-6 bg-white bg-opacity-50 rounded-lg shadow-lg flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-gochi-hand text-yellow-500">Who’s playing? 💖</h1>
          <p className="text-green-700">Please sign in to start the Spelling Bee.</p>
          <a href="/login" className="px-6 py-3 rounded-lg bg-green-500 text-white font-gochi-hand text-2xl hover:bg-green-600">Go to Login</a>
        </div>
      </div>
    );
  }

  const pickWord = () => {
    const randomIndex = Math.floor(Math.random() * words.length);
    const newWord = words[randomIndex];
    setWord(newWord);
    setFeedback('');
    setUserAnswer(''); // Clear previous answer
    return newWord;
  };

  const speakWord = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const startRound = () => {
    const newWord = pickWord();
    speakWord(`Spell: ${newWord}`);
  };

  const repeatWord = () => {
    if (word) {
      speakWord(`Spell: ${word}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Type a word',
        text: 'Please type your spelling before submitting.',
        confirmButtonColor: '#a855f7',
      });
      return;
    }

    const isCorrect = userAnswer.toLowerCase() === word.toLowerCase();

    if (isCorrect) {
      setFeedback('Correct!');
      try {
        triggerFireworks({ duration: 1200, particles: 150 });
      } catch (_) {}
      await Swal.fire({
        title: `Correct! ${emoji.party()}${emoji.heart()}`,
        imageUrl: getRandomCelebrateGif(),
        imageAlt: 'Celebrate',
        showConfirmButton: false,
        timer: 3000,
        background: 'transparent',
      });
    } else {
      setFeedback(`Incorrect. The word was ${word}.`);
      await Swal.fire({
        title: `Incorrect ${emoji.encourage()}`,
        text: `The correct spelling is ${word}. You got this! ${emoji.heart()}`,
        imageUrl: getRandomUpsetGif(),
        imageAlt: 'Try again',
        showConfirmButton: false,
        timer: 3000,
        background: 'transparent',
      });
    }
    // Auto-advance to the next round
    setTimeout(() => startRound(), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-green-200 relative">
      <Header onReset={() => {}} userName={user?.name} userImage={user?.image} />
      <div className="flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl md:text-6xl font-gochi-hand text-green-700 mb-8">Spelling Bee 🐝</h1>
        {!word && (
          <button
            onClick={startRound}
            className="px-8 py-4 text-2xl rounded-lg cursor-pointer bg-blue-500 text-white border-none hover:bg-blue-600 mb-4"
          >
            Start Round ▶🎤
          </button>
        )}
        {word && (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="px-4 py-2 rounded border text-xl text-center"
                placeholder="Type your spelling here"
                required
              />
              <div className="flex gap-2">
                <button type="button" onClick={repeatWord} className="px-6 py-3 text-xl rounded-lg cursor-pointer bg-blue-500 text-white border-none hover:bg-blue-600">Hear Again 🔊</button>
                <button type="submit" className="px-6 py-3 text-xl rounded-lg cursor-pointer bg-teal-400 text-white border-none hover:bg-teal-500">Submit Spelling</button>
              </div>
            </form>
          </>
        )}
        {feedback && <p className="text-xl font-bold mt-4">Feedback: {feedback}</p>}
      </div>
    </div>
  );
}

export default SpellingBeeMode;
