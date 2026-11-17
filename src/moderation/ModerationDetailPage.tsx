import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { moderationApi } from '../api/client';
import type { Application } from './model';
import { applicationTitle, decisionBody, formatDateTime, formatMoney, moderationError, statusLabel, typeLabel, validateRejection } from './model';

type Decision = 'approve' | 'reject';

export function ModerationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [choice, setChoice] = useState<Decision | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reload = useCallback(() => setReloadKey(k=>k+1), []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);setError(null);
    void (async () => {
      try {
        const { data, error: apiError, response } = await moderationApi.GET('/v1/moderation/applications/{id}', {
          params: { path: { id } }, signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!data) throw new Error(response.status === 403 ? 'У вас нет доступа к этой заявке.' :
          moderationError(apiError, 'Не удалось загрузить карточку заявки.'));
        setItem(data);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Не удалось загрузить заявку.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, reloadKey]);

  function openDecision(value: Decision) {
    setChoice(value);setComment('');setValidation(null);setActionError(null);setNotice(null);
  }

  async function submitDecision() {
    if (!id || !choice || saving || item?.status !== 'on_review') return;
    if (choice === 'reject') {
      const issue = validateRejection(comment);
      if (issue) { setValidation(issue); return; }
    }
    setSaving(true);setActionError(null);setValidation(null);
    try {
      const { data, error: apiError, response } = await moderationApi.POST('/v1/moderation/applications/{id}/decision', {
        params: { path: { id } }, body: decisionBody(choice, comment),
      });
      if (!data) {
        if (response.status === 409) {
          setChoice(null);
          setNotice('Заявку уже рассмотрел другой модератор. Данные обновлены.');
          reload();
          return;
        }
        throw new Error(moderationError(apiError, 'Не удалось сохранить решение. Попробуйте снова.'));
      }
      setItem(data);
      setChoice(null);
      setNotice(choice === 'approve' ? 'Заявка одобрена. Публикация объекта выполняется сервисом Events.' : 'Отказ отправлен автору заявки.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Не удалось сохранить решение.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="mod-page">
    <Link className="mod-back" to="/moderation/applications">← К очереди заявок</Link>
    {loading ? <div className="mod-surface mod-state" role="status">Загружаем карточку…</div>
      : error ? <div className="mod-surface mod-state" role="alert"><h2>Не удалось получить заявку</h2><p>{error}</p><button className="mod-action" onClick={reload}>Повторить</button></div>
      : item ? <>
        <div className="mod-page-top"><div><span className="mod-kicker">{typeLabel(item.type).toUpperCase()} · {item.id.slice(0,8)}</span>
          <h1>{applicationTitle(item)}</h1><p className="mod-muted">Заявка создана {formatDateTime(item.created_at)}</p></div>
          <span className={`mod-badge mod-${item.status}`}>{statusLabel(item.status)}</span>
        </div>
        {notice && <div className="mod-notice" role="status">{notice}</div>}
        <div className="mod-detail-grid"><section className="mod-surface mod-details" aria-label="Содержание заявки"><h2>Сведения для проверки</h2>
          <div className="mod-info-grid"><Info label="Тип заявки" value={typeLabel(item.type)}/><Info label="Автор (UUID)" value={item.author_user_id}/>
            {item.club_id && <Info label="Секция-организатор (UUID)" value={item.club_id}/>}
            {item.event ? <><Info label="Дата проведения" value={item.event.date}/><Info label="Место" value={item.event.place_address}/>
              <Info label="Участие" value={item.event.is_free ? 'Бесплатно' : item.event.price ? formatMoney(item.event.price.amount) : 'Стоимость не указана'}/></> : null}
            {item.club_page ? <><Info label="Место встреч" value={item.club_page.meeting_place || 'Не указано'}/>
              <Info label="Расписание" value={item.club_page.schedule || 'Не указано'}/></> : null}
          </div>
          <h3>Описание</h3><p className="mod-description">{item.event?.description || item.club_page?.description || 'Описание отсутствует'}</p>
          {item.club_page?.contacts && Object.keys(item.club_page.contacts).length > 0 && <><h3>Контакты секции</h3><div className="mod-info-grid">
            {Object.entries(item.club_page.contacts).map(([key,value])=><Info key={key} label={key} value={value}/>)}</div></>}
          {item.moderator_comment && <div className="mod-comment"><strong>Комментарий модератора</strong><p>{item.moderator_comment}</p></div>}
        </section>
        <aside className="mod-surface mod-decision-panel"><h2>Решение модератора</h2><p className="mod-muted">Проверьте содержание заявки перед решением.</p>
          {item.status === 'on_review' ? <><button className="mod-action" type="button" onClick={()=>openDecision('approve')}>Одобрить заявку</button>
            <button className="mod-danger-outline" type="button" onClick={()=>openDecision('reject')}>Отклонить заявку</button>
            <small>Отказ возможен только с объяснением причины.</small></>
          : <><div className={`mod-badge mod-${item.status}`}>{statusLabel(item.status)}</div>
            <p className="mod-muted">Решение принято {item.processed_at ? formatDateTime(item.processed_at) : 'ранее'}</p>
            {item.result_object_id && <p className="mod-small-muted">ID созданного объекта: {item.result_object_id}</p>}</>}
        </aside></div>
      </> : <div className="mod-surface mod-state">Заявка недоступна</div>}
    {choice && <div className="mod-modal-backdrop" role="presentation" onMouseDown={e => { if(e.target===e.currentTarget&&!saving)setChoice(null); }}>
      <section className="mod-modal" role="dialog" aria-modal="true" aria-labelledby="mod-dialog-title">
        <h2 id="mod-dialog-title">{choice === 'approve' ? 'Подтвердить одобрение?' : 'Отклонить заявку?'}</h2>
        <p className="mod-muted">{choice === 'approve' ? 'Модерация отправит событие для публикации мероприятия или секции.' : 'Укажите конкретную причину. Автор заявки увидит этот комментарий.'}</p>
        {choice === 'reject' && <label className="mod-comment-label">Комментарий к отказу <span aria-hidden="true">*</span>
          <textarea autoFocus maxLength={1000} value={comment} onChange={e=>{setComment(e.target.value);setValidation(null);}} aria-invalid={!!validation} aria-describedby={validation?'mod-comment-error':undefined} rows={5} placeholder="Например: уточните адрес и время проведения"/>
          <span className="mod-counter">{comment.length}/1000</span>
          {validation && <span className="mod-field-error" id="mod-comment-error">{validation}</span>}
        </label>}
        {actionError && <p className="mod-error" role="alert">{actionError}</p>}
        <div className="mod-modal-actions"><button className="mod-outline-button" type="button" disabled={saving} onClick={()=>setChoice(null)}>Отмена</button>
          <button className={choice === 'approve' ? 'mod-action' : 'mod-danger'} type="button" disabled={saving || (choice==='reject'&&!comment.trim())} onClick={()=>void submitDecision()}>
            {saving ? 'Сохраняем…' : choice === 'approve' ? 'Да, одобрить' : 'Отклонить с комментарием'}</button></div>
      </section></div>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="mod-info"><span>{label}</span><strong>{value}</strong></div>;
}
