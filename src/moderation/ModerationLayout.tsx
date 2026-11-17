import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ModerationLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return <div className="mod-shell">
    <header className="mod-header">
      <Link className="mod-brand" to="/account"><span className="mod-symbol" aria-hidden="true"/>tusumba<span className="mod-brand-tail">/ модерация</span></Link>
      <div className="mod-header-actions">
        <span className="mod-role-indicator">Роль: модератор</span>
        <button className="mod-link-button" type="button" onClick={async()=>{try{await logout();}catch{/* локальная сессия очищена */}finally{navigate('/login',{replace:true});}}}>Выйти</button>
      </div>
    </header>
    <div className="mod-layout">
      <nav className="mod-sidebar" aria-label="Навигация модератора">
        <NavLink to="/moderation/applications" end className={({isActive})=>isActive?'mod-nav-link active':'mod-nav-link'}>Очередь заявок</NavLink>
        <Link className="mod-nav-link" to="/account">Личный кабинет</Link>
      </nav>
      <main className="mod-content"><Outlet /></main>
    </div>
  </div>;
}
