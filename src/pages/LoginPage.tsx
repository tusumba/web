import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (status === 'authenticated') return <Navigate to="/account" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity.trim() || !password) {
      setError('Заполните оба поля.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(identity, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/account', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось войти. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-aside" aria-label="О Tusumba">
        <div className="brand brand-inverse"><span className="brand-icon" /> tusumba</div>
        <div className="aside-text">
          <p className="eyebrow">ЖИВИ ЯРЧЕ КАЖДЫЙ ДЕНЬ</p>
          <h1>Мир интересного совсем рядом.</h1>
          <p>Ищи события и секции, находи друзей и открывай новые увлечения вместе с Tusumba.</p>
          <div className="aside-card"><strong>Куда сходить в выходные?</strong><span>Подборка интересных событий и занятий</span></div>
        </div>
        <span className="aside-footer">TUSUMBA / СОБЫТИЯ И СЕКЦИИ</span>
      </section>
      <section className="auth-main">
        <div className="mobile-brand brand"><span className="brand-icon" /> tusumba</div>
        <div className="form-wrap">
          <p className="eyebrow teal">ДОБРО ПОЖАЛОВАТЬ</p>
          <h2>С возвращением!</h2>
          <p className="muted intro">Войди, чтобы продолжить находить события и управлять своими записями.</p>
          <form onSubmit={(event) => void handleSubmit(event)} noValidate>
            <label htmlFor="login">Электронная почта или ник</label>
            <input id="login" value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="name@example.com" autoComplete="username" required disabled={submitting} />
            <label htmlFor="password">Пароль</label>
            <div className="password-field">
              <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль" autoComplete="current-password" required disabled={submitting} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>{showPassword ? 'Скрыть' : 'Показать'}</button>
            </div>
            {error && <p role="alert" className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={submitting || status === 'loading'}>{submitting ? 'Входим…' : 'Войти'}</button>
          </form>
          <p className="hint">Учётные данные проверяются сервером Identity. Пароль в браузере не сохраняется.</p>
        </div>
      </section>
    </main>
  );
}
