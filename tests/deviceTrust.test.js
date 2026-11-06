import { describe, it, expect, beforeEach } from 'vitest';
import { signDevice, verifyDevice, deviceFailed, deviceRetryAfter, DEVICE_MAX_AGE_S, _resetDevices } from '../lib/deviceTrust';

const NOW = 1_800_000_000_000;
beforeEach(() => { process.env.NEXTAUTH_SECRET = 'test-secret-one'; _resetDevices(); });

describe('deviceTrust', () => {
  it('round-trips for the right user only', () => {
    const t = signDevice(7, NOW);
    expect(verifyDevice(t, 7, NOW + 1000)).toMatchObject({ nonce: expect.any(String) });
    expect(verifyDevice(t, 8, NOW + 1000)).toBeNull();
  });
  it('rejects forged, tampered, malformed, future-dated and expired tokens', () => {
    const t = signDevice(7, NOW);
    const [payload, mac] = t.split('.');
    expect(verifyDevice(`${payload}.${mac.slice(0, -2)}AA`, 7, NOW)).toBeNull();
    const forged = Buffer.from(`7.nonce.${NOW}`).toString('base64url');
    expect(verifyDevice(`${forged}.${mac}`, 7, NOW)).toBeNull();
    expect(verifyDevice('junk', 7, NOW)).toBeNull();
    expect(verifyDevice(undefined, 7, NOW)).toBeNull();
    expect(verifyDevice(signDevice(7, NOW + 3_600_000), 7, NOW)).toBeNull(); // issued in the future
    expect(verifyDevice(t, 7, NOW + DEVICE_MAX_AGE_S * 1000 + 1)).toBeNull(); // 90 days + 1ms
    expect(verifyDevice(t, 7, NOW + DEVICE_MAX_AGE_S * 1000 - 1000)).not.toBeNull();
  });
  it('a token signed with another secret is rejected; no secret disables the feature', () => {
    const t = signDevice(7, NOW);
    process.env.NEXTAUTH_SECRET = 'a-different-secret';
    expect(verifyDevice(t, 7, NOW)).toBeNull();
    delete process.env.NEXTAUTH_SECRET;
    expect(signDevice(7, NOW)).toBeNull();
    expect(verifyDevice(t, 7, NOW)).toBeNull();
  });
  it('the 5th failure rests the device 15 minutes and revokes the cookie', () => {
    const t = signDevice(7, NOW);
    const { nonce } = verifyDevice(t, 7, NOW);
    for (let i = 0; i < 4; i++) expect(deviceFailed(nonce, NOW).revoked).toBe(false);
    expect(deviceFailed(nonce, NOW)).toEqual({ revoked: true, retryAfter: 900 });
    expect(deviceRetryAfter(nonce, NOW + 1000)).toBe(899);
    expect(verifyDevice(t, 7, NOW)).toBeNull();
  });
});
