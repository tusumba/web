/**
 * Только для управления отображением интерфейса. JWT здесь не проверяется
 * криптографически: доступ ко всем /v1/moderation/* ограничивает сам API.
 * Источник ролей — claims access-токена (Identity RS256, `roles: string[]`).
 */
export function accessRoles(accessToken: string | null): string[] {
  if (!accessToken) return [];
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return [];
    const safe = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(safe)) as { roles?: unknown };
    return Array.isArray(decoded.roles) ? decoded.roles.filter((role): role is string => typeof role === 'string') : [];
  } catch { return []; }
}
