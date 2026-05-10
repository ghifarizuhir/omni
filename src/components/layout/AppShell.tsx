import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { InboxDrawer } from './InboxDrawer';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { AiQuickPanel } from '@/src/components/ai/AiQuickPanel';
import { cn } from '@/src/lib/utils';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiSidebarContent, setAiSidebarContent] = useState<React.ReactNode>(null);

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
      {/* Sidebar slot — slides between management nav and AI session panel */}
      <AnimatePresence mode="wait">
        {isAiRoute ? (
          <motion.div
            key="ai-sidebar"
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="flex-shrink-0 h-full border-r border-ois-border overflow-hidden"
          >
            {aiSidebarContent}
          </motion.div>
        ) : (
          <motion.div
            key="mgmt-sidebar"
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="flex-shrink-0 h-full"
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenInbox={() => setInboxOpen(true)}
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

      {/* Floating AI Quick Assist button */}
      {!isAiRoute && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative group">
            {/* Pulse ring — only when panel is closed */}
            {!aiPanelOpen && (
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  backgroundColor: 'rgba(31, 79, 212, 0.25)',
                  animationDuration: '2.5s',
                  animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                }}
              />
            )}
            {/* Glow aura */}
            <span
              className="absolute inset-[-4px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'radial-gradient(circle, rgba(31,79,212,0.2) 0%, transparent 70%)' }}
            />
            <motion.button
              onClick={() => setAiPanelOpen(v => !v)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                "relative w-11 h-11 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 transition-colors duration-200",
                aiPanelOpen
                  ? "bg-[#1F4FD4]"
                  : "bg-[#185FA5] hover:bg-[#1F4FD4]"
              )}
              aria-label="AI Quick Assist"
              aria-expanded={aiPanelOpen}
              type="button"
            >
              <motion.div
                animate={{ rotate: aiPanelOpen ? 20 : 0, scale: aiPanelOpen ? 0.9 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Sparkles size={20} className="text-white" />
              </motion.div>
            </motion.button>
            {/* Tooltip */}
            <div className="absolute bottom-[52px] right-0 px-2.5 py-1.5 bg-ois-text text-white rounded-md text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg">
              AI Quick Assist <span className="opacity-60 ml-1">⌘K</span>
              <div className="absolute bottom-[-4px] right-4 w-2 h-2 bg-ois-text rotate-45" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
