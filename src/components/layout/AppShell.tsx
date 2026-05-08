import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { InboxDrawer } from './InboxDrawer';
import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);

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
    </div>
  );
};
