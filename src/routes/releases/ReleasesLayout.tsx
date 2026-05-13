import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Package, GitBranch, FileText } from 'lucide-react';
import { mockReleases } from '@/src/mocks/releases';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Releases', to: '/releases',          icon: Package,    end: true },
  { label: 'Pipeline', to: '/releases/pipeline', icon: GitBranch },
  { label: 'Notes',    to: '/releases/notes',    icon: FileText },
];

export const ReleasesLayout: React.FC = () => {
  const deploying = mockReleases.filter(r => r.status === 'deploying').length;
  const rolledBack = mockReleases.filter(r => r.status === 'rolled_back').length;
  const ready = mockReleases.filter(r => r.status === 'ready').length;
  const inValidation = mockReleases.filter(r => r.status === 'in_validation').length;
  const released30d = (() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return mockReleases.filter(
      r => r.status === 'released' && r.actualReleaseDate && new Date(r.actualReleaseDate).getTime() >= cutoff,
    ).length;
  })();

  const accentColor =
    rolledBack > 0 ? '#B42318' :
    deploying > 0  ? '#DC6803' :
    ready > 0      ? '#12B76A' :
    '#1F4FD4';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Releases</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{mockReleases.length} tracked</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{released30d} released (30d)</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{inValidation} in validation</span>
              {deploying > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{deploying} deploying</span>
                </>
              )}
              {ready > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-success">{ready} ready</span>
                </>
              )}
              {rolledBack > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{rolledBack} rolled back</span>
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
