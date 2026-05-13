import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, BarChart3, FileEdit } from 'lucide-react';
import { mockKBArticles } from '@/src/mocks/kbArticles';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Browse',    to: '/kb',           icon: BookOpen,  end: true },
  { label: 'Analytics', to: '/kb/analytics', icon: BarChart3 },
  { label: 'Editor',    to: '/kb/editor',    icon: FileEdit },
];

export const KBLayout: React.FC = () => {
  const published = mockKBArticles.filter(a => a.status === 'published').length;
  const drafts    = mockKBArticles.filter(a => a.status === 'draft').length;
  const inReview  = mockKBArticles.filter(a => a.status === 'in_review').length;
  const expired   = mockKBArticles.filter(a => a.status === 'expired').length;

  const accentColor =
    expired > 0   ? '#DC6803' :
    inReview > 0  ? '#1F4FD4' :
    '#12B76A';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Knowledge Base</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{published} published</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{drafts} drafts</span>
              {inReview > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-text">{inReview} in review</span>
                </>
              )}
              {expired > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{expired} expired</span>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="flex px-4 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-ois-primary text-ois-primary'
                  : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};
