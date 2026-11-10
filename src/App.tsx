import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/account" element={<AccountPage />} />
      <Route path="/app" element={<Outlet />}>
        <Route index element={<Navigate to="/account" replace />} />
      </Route>
    </Route>
    <Route path="/" element={<Navigate to="/account" replace />} />
    <Route path="*" element={<Navigate to="/account" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
