import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { InboxDrawer } from './InboxDrawer';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AiQuickPanel } from '@/src/components/ai/AiQuickPanel';
import { ScopeProvider } from '@/src/lib/scope/ScopeContext';
import { CmdKPalette } from '@/src/components/ui/CmdKPalette';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiSidebarContent, setAiSidebarContent] = useState<React.ReactNode>(null);
  const [cmdKOpen, setCmdKOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const isAiRoute = location.pathname.startsWith('/ai');

  // M6.6 — listen for mid-session 401s. `apiFetch` dispatches
  // `auth:session-expired` on every 401 (`src/services/core.ts`). When that
  // fires, route to /login with the originating path so the user lands back
  // where they were after re-auth, and pass `reason: 'expired'` so the
  // login page can show a banner.
  useEffect(() => {
    const onExpired = (e: Event) => {
      const detail = (e as CustomEvent<{ from?: string }>).detail;
      // Avoid a navigation loop if the user is already on /login.
      if (window.location.pathname === '/login') return;
      navigate('/login', {
        replace: true,
        state: { from: detail?.from ?? location.pathname + location.search, reason: 'expired' as const },
      });
    };
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, [navigate, location.pathname, location.search]);

  // Cmd+K / Ctrl+K shortcut to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdKOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ScopeProvider>
    <div className="flex h-screen w-full bg-ois-bg overflow-hidden">
      {/* Sidebar — owns brand, mode toggle, and content switching internally */}
      <Sidebar
        collapsed={sidebarCollapsed}
        isAiRoute={isAiRoute}
        aiSidebarContent={aiSidebarContent}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenInbox={() => setInboxOpen(true)}
          onToggleAi={() => setAiPanelOpen(v => !v)}
          aiOpen={aiPanelOpen}
          showAi={!isAiRoute}
        />

        <div
          aria-hidden
          className="ois-topbar-stripe h-[2px] w-full shrink-0"
          style={{ background: 'linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)' }}
        />

        <main className={isAiRoute ? 'flex-1 overflow-hidden flex min-h-0' : 'flex-1 overflow-y-auto p-6'}>
          <Outlet context={{ setAiSidebarContent }} />
        </main>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {inboxOpen && (
          <InboxDrawer onClose={() => setInboxOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiPanelOpen && !isAiRoute && (
          <AiQuickPanel onClose={() => setAiPanelOpen(false)} />
        )}
      </AnimatePresence>

      <CmdKPalette open={cmdKOpen} onClose={() => setCmdKOpen(false)} />

    </div>
    </ScopeProvider>
  );
};
