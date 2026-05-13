import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ListChecks, KanbanSquare, Grid3x3, DollarSign } from 'lucide-react';
import {
  mockImprovements,
  getTotalEstimatedBenefitUSD,
  getTotalActualBenefitUSD,
  TODAY,
} from '@/src/mocks/improvements';
import { formatBenefitUSD } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Register', to: '/improvement',          icon: ListChecks,    end: true },
  { label: 'Kanban',   to: '/improvement/kanban',   icon: KanbanSquare },
  { label: 'Heatmap',  to: '/improvement/heatmap',  icon: Grid3x3 },
  { label: 'Benefits', to: '/improvement/benefits', icon: DollarSign },
];

export const ImprovementsLayout: React.FC = () => {
  const totalEstimated = getTotalEstimatedBenefitUSD();
  const totalActual = getTotalActualBenefitUSD();
  const inProgressCount = mockImprovements.filter(i => i.status === 'in_progress').length;
  const activeCount = mockImprovements.filter(
    i => !['completed', 'cancelled'].includes(i.status),
  ).length;
  const overdueCount = mockImprovements.filter(
    i => i.targetCompletionDate && i.targetCompletionDate < TODAY
      && !['completed', 'cancelled'].includes(i.status),
  ).length;
  const criticalBlocked = mockImprovements.filter(
    i => i.priority === 'critical' && i.status === 'on_hold',
  ).length;

  // Accent: red when critical work is blocked, amber when overdue exists,
  // green when realization is healthy, primary blue otherwise.
  const accentColor =
    criticalBlocked > 0 ? '#B42318' :
    overdueCount > 0    ? '#DC6803' :
    totalActual > 0 && totalActual >= totalEstimated * 0.5 ? '#12B76A' :
    '#1F4FD4';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Shared header ── */}
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">

        {/* Title block with accent strip */}
        <div className="flex items-stretch">
          <div
            className="w-1 shrink-0 transition-colors duration-500"
            style={{ backgroundColor: accentColor }}
          />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Improvements</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{activeCount} active</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{inProgressCount} in progress</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>
                <span className="font-semibold text-ois-text">{formatBenefitUSD(totalEstimated)}</span> estimated
              </span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>
                <span className="font-semibold text-ois-success">{formatBenefitUSD(totalActual)}</span> realized YTD
              </span>
              {overdueCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{overdueCount} overdue</span>
                </>
              )}
              {criticalBlocked > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{criticalBlocked} critical blocked</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
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

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
};
