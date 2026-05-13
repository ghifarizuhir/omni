import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Grid3x3, FileText, FlaskConical } from 'lucide-react';
import { continuityService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'BIA Matrix', to: '/continuity/bia',       icon: Grid3x3,      end: true },
  { label: 'DR Plans',   to: '/continuity/dr-plans',  icon: FileText },
  { label: 'DR Tests',   to: '/continuity/tests',     icon: FlaskConical },
];

export const ContinuityLayout: React.FC = () => {
  const { data: biaData } = useResource(() => continuityService.bia(), []);
  const { data: drPlansData } = useResource(() => continuityService.drPlans(), []);
  const { data: drRunsData } = useResource(() => continuityService.drRuns(), []);
  const mockBIAEntries = biaData ?? [];
  const mockDRPlans = drPlansData ?? [];
  const mockDRTestRuns = drRunsData ?? [];

  const catastrophic = mockBIAEntries.filter(b => b.impactLevel === 'catastrophic').length;
  const criticalImpact = mockBIAEntries.filter(b => b.impactLevel === 'critical').length;
  const activePlans = mockDRPlans.filter(p => p.status === 'active').length;
  const draftPlans  = mockDRPlans.filter(p => p.status === 'draft' || p.status === 'under_review').length;

  const failedTests = mockDRTestRuns.filter(t => t.status === 'failed').length;
  const recentTests = mockDRTestRuns.filter(t => t.status === 'passed' || t.status === 'passed_with_issues').length;

  const accentColor =
    failedTests > 0   ? '#B42318' :
    catastrophic > 0 && activePlans === 0 ? '#B42318' :
    draftPlans > 0    ? '#DC6803' :
    '#12B76A';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Business Continuity</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{mockBIAEntries.length} services in BIA</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{activePlans} active DR plans</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{recentTests} tests passed</span>
              {catastrophic > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{catastrophic} catastrophic</span>
                </>
              )}
              {criticalImpact > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{criticalImpact} critical</span>
                </>
              )}
              {failedTests > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{failedTests} failed tests</span>
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
