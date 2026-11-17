import type { components } from '../api/generated/moderation';

export type Application = components['schemas']['Application'];
export type ApplicationPage = components['schemas']['ApplicationPage'];
export type ApplicationStatus = components['schemas']['ApplicationStatus'];
export type ApplicationType = components['schemas']['ApplicationType'];
export type DecisionRequest = components['schemas']['ApplicationDecisionRequest'];

export function applicationTitle(item: Application): string {
  if (item.type === 'event') return item.event?.title || 'Мероприятие без названия';
  return item.club_page?.name || 'Секция без названия';
}

export function typeLabel(type: ApplicationType): string {
  return type === 'event' ? 'Мероприятие' : 'Секция';
}

export function statusLabel(status: ApplicationStatus): string {
  return ({ on_review: 'На проверке', approved: 'Одобрена', rejected: 'Отклонена' } as const)[status];
}

/** API требует непустой комментарий при отказе; максимум 1000 символов. */
export function validateRejection(comment: string): string | null {
  if (!comment.trim()) return 'Укажите причину отказа.';
  if (comment.trim().length > 1000) return 'Комментарий должен быть не длиннее 1000 символов.';
  return null;
}

export function decisionBody(decision: 'approve' | 'reject', comment = ''): DecisionRequest {
  if (decision === 'approve') return { decision: 'approve' };
  const issue = validateRejection(comment);
  if (issue) throw new Error(issue);
  return { decision: 'reject', comment: comment.trim() };
}

export function moderationError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const payload = (error as { error?: { message?: unknown } }).error;
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  }
  return fallback;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount / 100);
}
