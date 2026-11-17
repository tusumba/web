import { describe, expect, it } from 'vitest';
import { applicationTitle, decisionBody, formatMoney, moderationError, statusLabel, validateRejection } from './model';

const event = {
  id:'11111111-1111-4111-8111-111111111111', type:'event' as const,
  author_user_id:'22222222-2222-4222-8222-222222222222', status:'on_review' as const,
  created_at:'2026-11-17T10:00:00Z', event: { title:'Концерт', description:'Описание', date:'2026-12-10', place_address:'НГУ', is_free:false, price:{amount:30000,currency:'RUB' as const} },
};
describe('Moderation request decisions', () => {
  it('не позволяет отклонить без комментария', () => {
    expect(validateRejection('   ')).toBe('Укажите причину отказа.');
    expect(() => decisionBody('reject', '   ')).toThrow();
  });
  it('ограничивает комментарий 1000 символами и обрезает пробелы', () => {
    expect(validateRejection('x'.repeat(1001))).toContain('1000');
    expect(decisionBody('reject','  исправьте адрес  ')).toEqual({decision:'reject',comment:'исправьте адрес'});
  });
  it('при одобрении не передаёт лишний комментарий', () => {
    expect(decisionBody('approve','не отправлять')).toEqual({decision:'approve'});
  });
  it('показывает фактические поля API и суммы в копейках', () => {
    expect(applicationTitle(event)).toBe('Концерт');
    expect(formatMoney(30000)).toContain('300');
    expect(statusLabel('on_review')).toBe('На проверке');
  });
  it('извлекает серверную ошибку из единого контракта', () => {
    expect(moderationError({error:{code:'application_already_processed',message:'Заявка уже обработана.'}},'Ошибка')).toBe('Заявка уже обработана.');
  });
});
