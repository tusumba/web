export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const REFRESH_STORAGE_KEY = 'tusumba.refresh_token';

export class SessionExpiredError extends Error {
  constructor() {
    super('Сессия истекла, войдите заново.');
    this.name = 'SessionExpiredError';
  }
}

type Options = {
  baseUrl: string;
  storage: TokenStorage;
  fetcher: typeof fetch;
  now?: () => number;
};

/**
 * Access хранится только в памяти. Refresh — в sessionStorage текущей вкладки.
 * Для более высокой защиты от XSS необходим серверный HttpOnly cookie/BFF;
 * текущий Identity-контракт возвращает refresh в JSON.
 *
 * ОДНА общая Promise на refresh для всех запросов в этой вкладке.
 */
export class SessionManager {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshInFlight: Promise<string> | null = null;
  private generation = 0;
  private loggingOut = false;
  private readonly listeners = new Set<() => void>();
  private readonly now: () => number;

  constructor(private readonly options: Options) {
    this.now = options.now ?? Date.now;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  getRefreshToken(): string | null {
    return this.options.storage.getItem(REFRESH_STORAGE_KEY);
  }

  hasSession(): boolean {
    return this.getRefreshToken() !== null;
  }

  hasActiveAccess(): boolean {
    return this.accessToken !== null && this.now() + 5000 < this.expiresAt;
  }

  acceptTokens(pair: TokenPair): void {
    if (!pair.access_token || !pair.refresh_token || !Number.isFinite(pair.expires_in)) {
      throw new Error('Сервер вернул некорректную пару токенов.');
    }
    this.generation++;
    this.accessToken = pair.access_token;
    this.expiresAt = this.now() + Math.max(0, pair.expires_in) * 1000;
    this.options.storage.setItem(REFRESH_STORAGE_KEY, pair.refresh_token);
    this.notify();
  }

  clear(): void {
    this.generation++;
    this.accessToken = null;
    this.expiresAt = 0;
    this.options.storage.removeItem(REFRESH_STORAGE_KEY);
    this.notify();
  }

  private async post(path: string, body: { refresh_token: string }): Promise<Response> {
    return this.options.fetcher(this.options.baseUrl.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  refresh(): Promise<string> {
    if (this.refreshInFlight) return this.refreshInFlight;
    if (this.loggingOut) return Promise.reject(new SessionExpiredError());
    const token = this.getRefreshToken();
    if (!token) return Promise.reject(new SessionExpiredError());
    const version = this.generation;

    const operation = (async (): Promise<string> => {
      try {
        const response = await this.post('/v1/auth/refresh', { refresh_token: token });
        if (!response.ok) throw new SessionExpiredError();
        const nextPair = (await response.json()) as TokenPair;
        if (this.generation !== version) throw new SessionExpiredError();
        this.acceptTokens(nextPair);
        return nextPair.access_token;
      } catch (error) {
        if (this.generation === version) this.clear();
        throw error;
      }
    })();

    const shared = operation.finally(() => {
      if (this.refreshInFlight === shared) this.refreshInFlight = null;
    });
    this.refreshInFlight = shared;
    return shared;
  }

  /** Выполняет запрос не больше двух раз; повтор — ТОЛЬКО после token_expired. */
  async authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (this.loggingOut) throw new SessionExpiredError();
    const initialRequest = new Request(input, init);
    let token = this.accessToken;
    if (!this.hasActiveAccess()) token = await this.refresh();
    if (!token) throw new SessionExpiredError();

    const send = (bearer: string): Promise<Response> => {
      const request = initialRequest.clone();
      const headers = new Headers(request.headers);
      headers.set('Authorization', 'Bearer ' + bearer);
      return this.options.fetcher(new Request(request, { headers }));
    };

    const firstResponse = await send(token);
    if (firstResponse.status !== 401) return firstResponse;
    const payload: unknown = await firstResponse.clone().json().catch(() => null);
    if (getErrorCode(payload) !== 'token_expired') return firstResponse;

    try {
      // Если другой запрос уже обновил пару, повторного refresh быть не должно.
      const nextToken = this.accessToken && this.accessToken !== token
        ? this.accessToken
        : await this.refresh();
      return await send(nextToken);
    } catch {
      // Состояние сессии уже сброшено внутри refresh() при неуспехе.
      return firstResponse;
    }
  }

  /** POST /v1/auth/logout с АКТУАЛЬНЫМ refresh, даже если ротация только что завершилась. */
  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try {
      if (this.refreshInFlight) await this.refreshInFlight.catch(() => undefined);
      const token = this.getRefreshToken();
      if (token) await this.post('/v1/auth/logout', { refresh_token: token });
    } finally {
      this.clear();
      this.loggingOut = false;
    }
  }
}

export function getErrorCode(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as { error?: { code?: unknown }; code?: unknown };
  const code = payload.error?.code ?? payload.code;
  return typeof code === 'string' ? code : null;
}
