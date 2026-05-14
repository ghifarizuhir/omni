import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiFetch, ApiError } from '../../services/core';

type State = 'checking' | 'authed' | 'anon';

export const RequireAuth: React.FC = () => {
  const location = useLocation();
  const [state, setState] = useState<State>('checking');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/auth/me')
      .then(() => { if (!cancelled) setState('authed'); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) setState('anon');
        else setState('anon');
      });
    return () => { cancelled = true; };
  }, []);

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ois-bg text-[14px] text-[#6B7280]">
        Loading…
      </div>
    );
  }
  if (state === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
};
