import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

// Gentle, kid-friendly lockout: after MAX_FAILS wrong PINs the account rests for COOLDOWN_SECONDS.
// A correct PIN (once the cooldown is over) resets the counter. Stored in User.failedLoginAttempts / lockedUntil.
export const MAX_FAILS = 5;
export const COOLDOWN_SECONDS = 60;
const BCRYPT_ROUNDS = 10; // prod rows are $2b$ hashes; bcryptjs verifies them

export const isHashed = (pin) => typeof pin === 'string' && /^\$2[aby]\$/.test(pin);
export const hashPin = (pin) => bcrypt.hash(String(pin), BCRYPT_ROUNDS);

export const lockMessage = (seconds) =>
  `Let's take a short break! Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;

/**
 * Check name + PIN.
 * Returns { ok: true, user } or { ok: false, status, error, retryAfter? }.
 * Legacy rows that still hold a plaintext PIN are accepted once and upgraded to a bcrypt hash.
 */
export async function verifyPin(rawName, rawPin) {
  const name = String(rawName || '').trim();
  const pin = String(rawPin || '');
  if (!name || !/^\d{4}$/.test(pin)) {
    return { ok: false, status: 400, error: 'Name and a 4-digit PIN required' };
  }
  const invalid = { ok: false, status: 401, error: 'Invalid name or PIN' };
  let user = await prisma.user.findUnique({ where: { name } });
  if (!user || user.isGuest) return invalid; // guest seats have no PIN and can never be typed into

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const retryAfter = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
    return { ok: false, status: 429, error: lockMessage(retryAfter), retryAfter };
  }
  if (user.lockedUntil) {
    // cooldown over: fresh start
    user = await prisma.user.update({ where: { id: user.id }, data: { lockedUntil: null, failedLoginAttempts: 0 } });
  }

  let match = false;
  if (user.pin) {
    match = isHashed(user.pin) ? await bcrypt.compare(pin, user.pin) : user.pin === pin;
  }

  if (match) {
    const data = {};
    if (!isHashed(user.pin)) data.pin = await hashPin(pin); // upgrade legacy plaintext
    if (user.failedLoginAttempts !== 0 || user.lockedUntil) { data.failedLoginAttempts = 0; data.lockedUntil = null; }
    if (Object.keys(data).length) await prisma.user.update({ where: { id: user.id }, data });
    return { ok: true, user };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: { increment: 1 } },
  });
  if (updated.failedLoginAttempts >= MAX_FAILS) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lockedUntil: new Date(Date.now() + COOLDOWN_SECONDS * 1000) },
    });
    return { ok: false, status: 429, error: lockMessage(COOLDOWN_SECONDS), retryAfter: COOLDOWN_SECONDS };
  }
  return invalid;
}
