import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { InboxDrawer } from './InboxDrawer';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { AiQuickPanel } from '@/src/components/ai/AiQuickPanel';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const location = useLocation();
  const isAiRoute = location.pathname.startsWith('/ai');

  // Cmd+K / Ctrl+K shortcut to toggle AI panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isAiRoute) {
        e.preventDefault();
        setAiPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiRoute]);

  return (
    <div className="flex h-screen w-full bg-ois-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenInbox={() => setInboxOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
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
          <AiQuickPanel isOpen={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
        )}
      </AnimatePresence>

      {/* Floating AI Quick Assist button */}
      {!isAiRoute && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <button
            onClick={() => setAiPanelOpen(true)}
            className="w-11 h-11 rounded-full bg-[#185FA5] flex items-center justify-center hover:bg-[#1F4FD4] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
            aria-label="AI Quick Assist"
            type="button"
          >
            <Sparkles size={20} className="text-white" />
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-12 right-0 px-2 py-1 bg-ois-surface border border-ois-border rounded-md text-[11px] text-ois-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
            AI Quick Assist (⌘K)
          </div>
        </div>
      )}
    </div>
  );
};
