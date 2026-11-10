import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AccountPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } catch {
      setError('Сервер не подтвердил выход. Локальные токены удалены.');
    } finally {
      setBusy(false);
      navigate('/login', { replace: true });
    }
  }
  return <main className="account-layout">
    <header><div className="brand"><span className="brand-icon" /> tusumba</div></header>
    <section className="account-card">
      <p className="eyebrow teal">АККАУНТ</p>
      <h1>Ты в Tusumba!</h1>
      <p className="muted">Авторизация работает. Страницы каталога, билетов и профиля будут подключены в следующих задачах.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="button" className="primary-button" onClick={() => void handleLogout()} disabled={busy}>{busy ? 'Выходим…' : 'Выйти из аккаунта'}</button>
    </section>
  </main>;
}
