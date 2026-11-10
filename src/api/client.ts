import createClient from 'openapi-fetch';
import type { paths } from './generated/identity';
import { SessionManager } from '../auth/sessionManager';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const session = new SessionManager({
  baseUrl: apiBaseUrl,
  storage: window.sessionStorage,
  fetcher: window.fetch.bind(window),
});

/** Типизированный клиент из OpenAPI Identity. Авторизацию делаем отдельно. */
export const publicApi = createClient<paths>({ baseUrl: apiBaseUrl });

/** Для защищённых запросов других сервисов: Authorization + single-flight refresh. */
export const api = createClient<paths>({
  baseUrl: apiBaseUrl,
  fetch: (input, init) => session.authenticatedFetch(input, init),
});

export function loginMessage(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value) {
    const nested = (value as { error?: { code?: string; message?: string } }).error;
    if (nested?.code === 'invalid_credentials') return 'Неверный логин или пароль.';
    if (nested?.code === 'validation_error') return 'Заполните оба поля.';
  }
  return 'Не удалось войти. Попробуйте позже.';
}
