import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** UX-проверка роли; реальное разграничение прав выполняет Moderation API (403). */
export function ModeratorRoute() {
  const { roles, status } = useAuth();
  if (status === 'loading') return <main className="loading">Проверяем права…</main>;
  if (status !== 'authenticated') return null; // внешний ProtectedRoute перенаправит на /login
  if (!roles.includes('moderator')) return <main className="mod-denied">
    <div className="mod-surface"><span className="mod-kicker">Доступ ограничен</span><h1>Только для модераторов</h1>
      <p>Для просмотра заявок необходима роль moderator. Если права недавно изменились, выйдите и войдите заново.</p>
      <Link className="mod-action" to="/account">Вернуться в личный кабинет</Link></div>
  </main>;
  return <Outlet />;
}
