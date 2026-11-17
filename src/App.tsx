import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { ModerationLayout } from './moderation/ModerationLayout';
import { ModeratorRoute } from './moderation/ModeratorRoute';
import { ModerationQueuePage } from './moderation/ModerationQueuePage';
import { ModerationDetailPage } from './moderation/ModerationDetailPage';
import './moderation/moderation.css';

export function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/account" element={<AccountPage />} />
      <Route element={<ModeratorRoute />}>
        <Route path="/moderation" element={<ModerationLayout />}>
          <Route index element={<Navigate to="applications" replace />} />
          <Route path="applications" element={<ModerationQueuePage />} />
          <Route path="applications/:id" element={<ModerationDetailPage />} />
        </Route>
      </Route>
      <Route path="/app" element={<Outlet />}>
        <Route index element={<Navigate to="/account" replace />} />
      </Route>
    </Route>
    <Route path="/" element={<Navigate to="/account" replace />} />
    <Route path="*" element={<Navigate to="/account" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
