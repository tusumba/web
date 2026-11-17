import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { moderationApi } from '../api/client';
import type { ApplicationPage, ApplicationStatus, ApplicationType } from './model';
import { applicationTitle, formatDateTime, moderationError, statusLabel, typeLabel } from './model';

const PAGE_SIZE = 20;
type TypeFilter = ApplicationType | 'all';

export function ModerationQueuePage() {
  const [status, setStatus] = useState<ApplicationStatus>('on_review');
  const [type, setType] = useState<TypeFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ApplicationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey(n => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    void (async () => {
      try {
        const { data, error: apiError, response } = await moderationApi.GET('/v1/moderation/applications', {
          params: { query: { status, type: type === 'all' ? undefined : type, page, size: PAGE_SIZE } },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!data) throw new Error(response.status === 403
          ? 'У вас нет прав для просмотра очереди заявок.'
          : moderationError(apiError, 'Не удалось загрузить очередь заявок. Попробуйте снова.'));
        setResult(data);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Не удалось загрузить заявки.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [status, type, page, reloadKey]);

  return <div className="mod-page">
    <div className="mod-page-top"><div><span className="mod-kicker">ПРОВЕРКА ПУБЛИКАЦИЙ</span><h1>Очередь заявок</h1><p className="mod-muted">Сначала показываются самые старые заявки, ожидающие решения.</p></div>
      <button className="mod-outline-button" type="button" onClick={reload}>Обновить</button></div>
    <section className="mod-surface mod-filter-row" aria-label="Фильтры заявок">
      <label>Статус<select value={status} onChange={e => { setStatus(e.target.value as ApplicationStatus); setPage(1); }}>
        <option value="on_review">На проверке</option><option value="approved">Одобрены</option><option value="rejected">Отклонены</option>
      </select></label>
      <label>Тип<select value={type} onChange={e => { setType(e.target.value as TypeFilter); setPage(1); }}>
        <option value="all">Все типы</option><option value="event">Мероприятия</option><option value="club_page">Секции</option>
      </select></label>
    </section>
    {loading ? <div className="mod-surface mod-state" role="status">Загружаем заявки…</div>
      : error ? <div className="mod-surface mod-state" role="alert"><h2>Не удалось получить данные</h2><p>{error}</p><button className="mod-action" onClick={reload}>Повторить</button></div>
      : !result || result.items.length === 0 ? <div className="mod-surface mod-state"><h2>Заявок не найдено</h2><p>Для выбранных фильтров пока нет заявок.</p><button className="mod-outline-button" onClick={reload}>Обновить</button></div>
      : <section className="mod-surface mod-list" aria-label="Список заявок">
        <div className="mod-list-heading"><strong>Заявки <span className="mod-small-muted">({result.total})</span></strong><span className="mod-small-muted">Страница {result.page}</span></div>
        {result.items.map(item => <Link className="mod-list-item" key={item.id} to={`/moderation/applications/${item.id}`}>
          <div className="mod-avatar" aria-hidden="true">{item.type === 'event' ? 'М' : 'С'}</div>
          <div className="mod-row-content"><div className="mod-row-title">{applicationTitle(item)}</div><div className="mod-row-caption">{typeLabel(item.type)} · {formatDateTime(item.created_at)}</div></div>
          <span className={`mod-badge mod-${item.status}`}>{statusLabel(item.status)}</span><span className="mod-row-arrow" aria-hidden="true">›</span>
        </Link>)}
        <div className="mod-pagination"><button className="mod-outline-button" disabled={page === 1} onClick={()=>setPage(p=>p-1)}>← Назад</button>
          <span>Страница {result.page} из {Math.max(1,Math.ceil(result.total / PAGE_SIZE))}</span>
          <button className="mod-outline-button" disabled={page * PAGE_SIZE >= result.total} onClick={()=>setPage(p=>p+1)}>Далее →</button></div>
      </section>}
  </div>;
}
