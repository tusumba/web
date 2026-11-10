import { describe, expect, it, vi } from 'vitest';
import { REFRESH_STORAGE_KEY, SessionManager } from './sessionManager';

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
const pair = (access: string, refresh: string, seconds = 3600) => ({
  access_token: access, refresh_token: refresh, expires_in: seconds,
});
const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

describe('SessionManager / requirement #18999', () => {
  it('обновляет refresh строго одним запросом при конкурентных запросах', async () => {
    const storage = fakeStorage();
    let refreshCount = 0;
    let protectedCount = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);
      if (pathname === '/v1/auth/refresh') {
        refreshCount++;
        expect((await request.json()).refresh_token).toBe('r1');
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(pair('a2', 'r2'));
      }
      protectedCount++;
      return json({ ok: true, header: request.headers.get('Authorization') });
    });
    const session = new SessionManager({ baseUrl: 'https://api.test', storage, fetcher, now: () => 1000 });
    session.acceptTokens(pair('a1', 'r1', 1));
    const results = await Promise.all(Array.from({ length: 8 }, () => session.authenticatedFetch('https://api.test/private')));
    expect(refreshCount).toBe(1);
    expect(protectedCount).toBe(8);
    expect(results.map((response) => response.status)).toEqual(Array(8).fill(200));
    expect((await results[0].json()).header).toBe('Bearer a2');
    expect(storage.getItem(REFRESH_STORAGE_KEY)).toBe('r2');
  });

  it('перезапускает запрос только на 401 token_expired и не обновляет повторно новую пару', async () => {
    const storage = fakeStorage();
    let refreshCount = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);
      if (pathname === '/v1/auth/refresh') {
        refreshCount++;
        return json(pair('a2', 'r2'));
      }
      const auth = request.headers.get('Authorization');
      if (auth === 'Bearer a1') return json({ error: { code: 'token_expired', message: 'Expired' } }, 401);
      return json({ ok: true });
    });
    const session = new SessionManager({ baseUrl: 'https://api.test', storage, fetcher, now: () => 1000 });
    session.acceptTokens(pair('a1', 'r1'));
    const responses = await Promise.all([session.authenticatedFetch('https://api.test/a'), session.authenticatedFetch('https://api.test/b')]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(refreshCount).toBe(1);
    expect(storage.getItem(REFRESH_STORAGE_KEY)).toBe('r2');
  });

  it('не обновляет на 401 invalid_token', async () => {
    const fetcher = vi.fn(async () => json({ error: { code: 'invalid_token', message: 'Invalid' } }, 401));
    const session = new SessionManager({ baseUrl: 'https://api.test', storage: fakeStorage(), fetcher });
    session.acceptTokens(pair('a1', 'r1'));
    const result = await session.authenticatedFetch('https://api.test/private');
    expect(result.status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('очищает локальные токены при неуспешном refresh', async () => {
    const storage = fakeStorage();
    const fetcher = vi.fn(async () => json({ error: { code: 'invalid_refresh_token', message: 'Expired' } }, 401));
    const session = new SessionManager({ baseUrl: 'https://api.test', storage, fetcher, now: () => 1000 });
    session.acceptTokens(pair('a1', 'r1', 1));
    await expect(session.refresh()).rejects.toThrow();
    expect(session.hasSession()).toBe(false);
  });

  it('logout отправляет актуальный refresh и всегда очищает sessionStorage', async () => {
    const storage = fakeStorage();
    const sent: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const payload = await request.json();
      sent.push(payload.refresh_token as string);
      return new Response(null, { status: 204 });
    });
    const session = new SessionManager({ baseUrl: 'https://api.test', storage, fetcher });
    session.acceptTokens(pair('a1', 'r1'));
    session.acceptTokens(pair('a2', 'r2'));
    await session.logout();
    expect(sent).toEqual(['r2']);
    expect(storage.getItem(REFRESH_STORAGE_KEY)).toBeNull();
  });
});

describe('SessionManager / logout during refresh', () => {
  it('дожидается ротации и отзывает новый refresh вместо старого', async () => {
    const storage = fakeStorage();
    const sent: string[] = [];
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);
      if (pathname.endsWith('/refresh')) {
        await blocker;
        return json(pair('a2', 'r2'));
      }
      if (pathname.endsWith('/logout')) {
        sent.push((await request.json()).refresh_token as string);
        return new Response(null, { status: 204 });
      }
      return json({ ok: true });
    });
    const session = new SessionManager({ baseUrl: 'https://api.test', storage, fetcher, now: () => 1000 });
    session.acceptTokens(pair('a1', 'r1', 1));
    const refreshing = session.refresh();
    const loggingOut = session.logout();
    release();
    await refreshing;
    await loggingOut;
    expect(sent).toEqual(['r2']);
    expect(session.hasSession()).toBe(false);
  });
});
