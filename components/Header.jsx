"use client";
import { emoji } from '../lib/emoji';

function Header({ onReset, userName, userImage }) {
  return (
    <header className="w-full p-4 bg-white bg-opacity-50 shadow-md flex items-center justify-between">
      <div className="flex items-center">
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userImage} alt={`${userName}'s Avatar`} className="w-12 h-12 md:w-16 md:h-16 rounded-full mr-4" />
        ) : (
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full mr-4 bg-gray-300"></div>
        )}
        <h1 className="text-lg md:text-2xl font-gochi-hand text-pink-500">Hey {userName}, love that you are learning! 🦄 {emoji.heart()}</h1>
      </div>
      <button onClick={onReset} className="px-4 py-2 text-sm md:text-base rounded-lg cursor-pointer bg-purple-400 text-white border-none hover:bg-purple-500">Main Menu  🏠</button>
    </header>
  );
}

export default Header;

