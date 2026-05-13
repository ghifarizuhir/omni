import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Rocket, Server } from 'lucide-react';
import { mockDeployments } from '@/src/mocks/deployments';
import { mockEnvironments } from '@/src/mocks/environments';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Queue',        to: '/deployments',  icon: Rocket, end: true },
  { label: 'Environments', to: '/environments', icon: Server },
];

export const DeploymentsLayout: React.FC = () => {
  const running = mockDeployments.filter(d => d.status === 'running').length;
  const pending = mockDeployments.filter(d => d.status === 'pending').length;
  const rollingBack = mockDeployments.filter(d => d.status === 'rolling_back').length;
  const failed24h = (() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return mockDeployments.filter(d => d.status === 'failed' && new Date(d.updatedAt).getTime() >= cutoff).length;
  })();
  const envCount = mockEnvironments.length;

  const accentColor =
    rollingBack > 0 ? '#B42318' :
    failed24h > 0   ? '#DC6803' :
    running > 0     ? '#1F4FD4' :
    '#12B76A';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Deployments</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{envCount} environments</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{pending} pending</span>
              {running > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-primary">{running} running</span>
                </>
              )}
              {rollingBack > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{rollingBack} rolling back</span>
                </>
              )}
              {failed24h > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{failed24h} failed (24h)</span>
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
