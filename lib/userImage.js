// `user.image` is a public path set at seed time. The prod row for Braylee may still hold the deleted
// /Braylee.jpg, so callers pass it through here: a known-dead value becomes null and the UI shows the emoji
// astronaut instead of a broken image.
const DEAD_IMAGES = new Set(['/Braylee.jpg']);

export function currentUserImage(image) {
  if (typeof image !== 'string' || !image || DEAD_IMAGES.has(image)) return null;
  return image;
}
