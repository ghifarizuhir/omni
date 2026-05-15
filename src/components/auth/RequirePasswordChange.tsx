import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthSession } from '@/src/lib/auth/session';

export function RequirePasswordChange() {
  const session = useAuthSession();
  const location = useLocation();

  if (session?.user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
