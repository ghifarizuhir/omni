import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, FileText, PlayCircle, ClipboardCheck } from 'lucide-react';
import { mockTestPlans } from '@/src/mocks/testPlans';
import { mockTestRuns, getActiveTestRuns } from '@/src/mocks/testRuns';
import { mockSignOffs } from '@/src/mocks/signOffs';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Plans',    to: '/testing/plans',    icon: ClipboardList, end: true },
  { label: 'Cases',    to: '/testing/cases',    icon: FileText },
  { label: 'Runs',     to: '/testing/runs',     icon: PlayCircle },
  { label: 'Sign-Off', to: '/testing/sign-off', icon: ClipboardCheck },
];

export const TestingLayout: React.FC = () => {
  const activePlans = mockTestPlans.filter(p => p.status === 'active').length;
  const activeRuns = getActiveTestRuns().length;

  const completedRuns = mockTestRuns.filter(r => r.status !== 'running' && r.status !== 'pending');
  const passed = completedRuns.filter(r => r.status === 'passed').length;
  const passRate = completedRuns.length ? Math.round((passed / completedRuns.length) * 100) : 0;

  const pendingSignOffs = mockSignOffs.filter(s => s.status === 'pending').length;
  const breachedSignOffs = mockSignOffs.filter(s => {
    if (s.status !== 'pending') return false;
    return new Date(s.dueAt).getTime() < Date.now();
  }).length;

  const accentColor =
    breachedSignOffs > 0 ? '#B42318' :
    passRate < 80       ? '#DC6803' :
    passRate >= 95      ? '#12B76A' :
    '#1F4FD4';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Testing</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{activePlans} active plans</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{activeRuns} runs in progress</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>
                <span className="font-semibold text-ois-text">{passRate}%</span> pass rate
              </span>
              {pendingSignOffs > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span>{pendingSignOffs} sign-offs pending</span>
                </>
              )}
              {breachedSignOffs > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{breachedSignOffs} SLA breached</span>
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
