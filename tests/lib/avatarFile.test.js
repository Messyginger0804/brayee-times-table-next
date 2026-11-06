import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

vi.mock('fs/promises', () => ({ readFile: vi.fn() }));
import { readFile } from 'fs/promises';
import { avatarSize, readAvatarMap, hasKey, avatarResponse } from '../../lib/avatarFile';

const ROOT = path.join(process.cwd(), 'private');
beforeEach(() => { vi.clearAllMocks(); readFile.mockResolvedValue(Buffer.from('IMG')); });

describe('avatarSize', () => {
  it.each([['?size=160', '160'], ['?size=512', '512'], ['?size=999', '512'], ['?size=../x', '512'], ['', '512']])('%j -> %s', (q, out) => {
    expect(avatarSize(new Request(`http://x/a${q}`))).toBe(out);
  });
});

describe('readAvatarMap / hasKey', () => {
  it('parses private/avatars.json', async () => {
    readFile.mockResolvedValue('{"Kid":"a.png"}');
    expect(await readAvatarMap()).toEqual({ Kid: 'a.png' });
    expect(readFile).toHaveBeenCalledWith(path.join(ROOT, 'avatars.json'), 'utf8');
  });
  it('throws on invalid JSON so callers can 404', async () => {
    readFile.mockResolvedValue('{oops');
    await expect(readAvatarMap()).rejects.toThrow();
  });
  it('hasKey ignores inherited properties', () => {
    expect(hasKey({ a: 1 }, 'a')).toBe(true);
    expect(hasKey({}, 'toString')).toBe(false);
    expect(hasKey({}, '__proto__')).toBe(false);
  });
});

describe('avatarResponse', () => {
  it('serves a string entry with type, nosniff and the requested cache scope', async () => {
    const res = await avatarResponse('avatars/kid.png', '512', 'private');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('private, max-age=3600');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(readFile).toHaveBeenCalledWith(path.resolve(ROOT, 'avatars/kid.png'));
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('IMG');
  });
  it('public scope and extension case-insensitivity', async () => {
    const res = await avatarResponse('a/K.JPG', '512', 'public');
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });
  it.each([['x.jpeg', 'image/jpeg'], ['x.webp', 'image/webp']])('maps %s', async (f, t) => {
    expect((await avatarResponse(f, '512', 'private')).headers.get('content-type')).toBe(t);
  });
  it('size map: picks the requested size, falls back to 512', async () => {
    const entry = { 160: 'small.png', 512: 'big.png' };
    await avatarResponse(entry, '160', 'private');
    expect(readFile).toHaveBeenLastCalledWith(path.resolve(ROOT, 'small.png'));
    await avatarResponse({ 512: 'big.png' }, '160', 'private');
    expect(readFile).toHaveBeenLastCalledWith(path.resolve(ROOT, 'big.png'));
  });
  it.each([[null], [undefined], [{}], [42], [{ 512: 7 }]])('returns null for unusable entry %j', async (e) => {
    expect(await avatarResponse(e, '512', 'private')).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
  });
  it('returns null for unsupported extensions', async () => {
    expect(await avatarResponse('secrets.json', '512', 'private')).toBeNull();
    expect(await avatarResponse('noext', '512', 'private')).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
  });
  it('refuses path traversal and absolute paths outside private/', async () => {
    expect(await avatarResponse('../.env.png', '512', 'private')).toBeNull();
    expect(await avatarResponse('../../etc/passwd.png', '512', 'private')).toBeNull();
    expect(await avatarResponse('/etc/x.png', '512', 'private')).toBeNull();
    expect(await avatarResponse('../private-evil/x.png', '512', 'private')).toBeNull(); // sibling dir sharing the prefix
    expect(readFile).not.toHaveBeenCalled();
  });
  it('propagates a read failure (routes turn it into 404)', async () => {
    readFile.mockRejectedValue(new Error('ENOENT'));
    await expect(avatarResponse('a.png', '512', 'private')).rejects.toThrow('ENOENT');
  });
});
