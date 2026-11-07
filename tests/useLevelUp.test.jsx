// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
import { useLevelUp } from '../components/modes/shared/useLevelUp';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function setup() {
  const setUser = vi.fn();
  const setMode = vi.fn();
  const fetchProblems = vi.fn();
  let api;
  const Harness = () => { api = useLevelUp({ user: { level: 1 }, setUser, setMode, fetchProblems }); return null; };
  const root = createRoot(document.createElement('div'));
  await act(async () => { root.render(h(Harness)); });
  return { api: () => api, setUser, setMode, fetchProblems };
}

describe('useLevelUp', () => {
  beforeEach(() => { axios.post.mockReset(); axios.post.mockResolvedValue({ data: { level: 2 } }); });

  it('holds back a stay level-up until applyPendingLevel', async () => {
    const t = await setup();
    let ok;
    await act(async () => { ok = await t.api()[0]({ stay: true }); });
    expect(ok).toBe(true);
    expect(t.setUser).not.toHaveBeenCalled();
    act(() => t.api()[1]());
    expect(t.setUser).toHaveBeenCalledTimes(1);
  });

  it('a later non-stay call applies the pending level instead of dropping it, without re-saving', async () => {
    const t = await setup();
    await act(async () => { await t.api()[0]({ stay: true }); });
    await act(async () => { await t.api()[0](); });
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(t.setUser).toHaveBeenCalledTimes(1);
    expect(t.setMode).toHaveBeenCalledWith(null);
    expect(t.fetchProblems).toHaveBeenCalled();
  });

  it('reports false when the save fails', async () => {
    axios.post.mockRejectedValue(new Error('x'));
    const t = await setup();
    let ok;
    await act(async () => { ok = await t.api()[0](); });
    expect(ok).toBe(false);
  });
});
