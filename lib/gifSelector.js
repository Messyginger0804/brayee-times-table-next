const celebrateGifs = [
  '/gifs/goodGif1.gif',
  '/gifs/goodGif2.gif',
  '/gifs/goodGif3.gif',
];

const upsetGifs = [
  '/gifs/oopsGif1.jpg',
  '/gifs/oopsGif2.jpg',
  '/gifs/oopsGif3.gif',
];

function getRandomFrom(list) {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

export function getRandomCelebrateGif() {
  return getRandomFrom(celebrateGifs);
}

export function getRandomUpsetGif() {
  return getRandomFrom(upsetGifs);
}

