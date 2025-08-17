"use client";
import { useState } from 'react';
import LevelIndicator from './LevelIndicator';
import Header from './Header';
import { emoji } from '../lib/emoji';

function MemorizeMode({ user, problems, level, onReset }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => setIsFlipped(!isFlipped);
  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((currentCardIndex + 1) % problems.length);
  };

  if (problems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 relative">
        <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
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
      <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
      <div className="flex flex-col items-center justify-center text-center p-4">
        <LevelIndicator level={level} />
        <h1 className="text-4xl md:text-6xl font-gochi-hand text-pink-500 mb-8">Memorize Mode 🧠💖</h1>
        <div className="w-64 h-40 md:w-72 md:h-48 [perspective:1000px] cursor-pointer mb-8" onClick={handleCardClick}>
          <div className={`relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d] shadow-lg ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            <div className="absolute w-full h-full backface-hidden flex items-center justify-center text-3xl md:text-4xl rounded-lg bg-teal-300 text-white">
              <p>{currentCard.problem}</p>
            </div>
            <div className="absolute w-full h-full backface-hidden flex items-center justify-center text-3xl md:text-4xl rounded-lg bg-green-500 text-white [transform:rotateY(180deg)]">
              <p>{currentCard.answer}</p>
            </div>
          </div>
        </div>
        <button onClick={handleNextCard} className="px-6 py-3 md:px-8 md:py-4 text-xl md:text-2xl rounded-lg cursor-pointer bg-purple-400 text-white border-none hover:bg-purple-500 mb-4">Next {emoji.next()}</button>
      </div>
    </div>
  );
}

export default MemorizeMode;

