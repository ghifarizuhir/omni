import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatDate } from '@/src/lib/format';
import { getImprovementById } from '@/src/mocks/improvements';
import { getROICalculation } from '@/src/mocks/roiCalculations';
import {
  improvementStatusMeta,
  improvementCategoryMeta,
  improvementPriorityMeta,
  formatBenefitUSD,
} from '@/src/lib/constants';
import { ImprovementStatusPill } from '@/src/components/improvement/ImprovementStatusPill';
import { ImprovementCategoryChip } from '@/src/components/improvement/ImprovementCategoryChip';
import { ImprovementPriorityDot } from '@/src/components/improvement/ImprovementPriorityDot';
import { ImprovementProgressBar } from '@/src/components/improvement/ImprovementProgressBar';
import { ROISummaryPanel } from '@/src/components/improvement/ROISummaryPanel';
import { OverviewTab } from '@/src/components/improvement/ImprovementDetail/OverviewTab';
import { ProgressTab } from '@/src/components/improvement/ImprovementDetail/ProgressTab';
import { MetricsTab } from '@/src/components/improvement/ImprovementDetail/MetricsTab';
import { ROITab } from '@/src/components/improvement/ImprovementDetail/ROITab';
import { LinkedItemsTab } from '@/src/components/improvement/ImprovementDetail/LinkedItemsTab';
import { UpdatesTab } from '@/src/components/improvement/ImprovementDetail/UpdatesTab';
import { ImprovementInitiative, ImprovementUpdate } from '@/src/types/improvement';

const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'progress',      label: 'Progress' },
  { id: 'metrics',       label: 'Metrics' },
  { id: 'roi',           label: 'ROI' },
  { id: 'linked',        label: 'Linked Items' },
  { id: 'updates',       label: 'Updates' },
];

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

export const ImprovementDetail: React.FC = () => {
  const { initiativeId } = useParams<{ initiativeId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [initiative, setInitiative] = useState<ImprovementInitiative | undefined>(
    initiativeId ? getImprovementById(initiativeId) : undefined
  );

  if (!initiative) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <p className="text-lg font-bold text-ois-text">Initiative not found</p>
        <Link to="/improvement" className="text-sm text-ois-primary hover:underline">← Back to register</Link>
      </div>
    );
  }

  const roiCalc = getROICalculation(initiative.id);
  const updatesCount = initiative.updates.length;

  const tabsWithCount = TABS.map(t =>
    t.id === 'updates' ? { ...t, label: `Updates (${updatesCount})` } : t
  );

  const handleLogUpdate = (body: string, pct: number) => {
    const newUpdate: ImprovementUpdate = {
      id: `upd-local-${Date.now()}`,
      initiativeId: initiative.id,
      authorId: 'u-001',
      authorName: 'Sarah Chen',
      timestamp: new Date().toISOString(),
      type: 'progress_update',
      body,
      progressBefore: initiative.progressPercent,
      progressAfter: pct,
    };
    setInitiative(prev => prev ? {
      ...prev,
      progressPercent: pct,
      updates: [newUpdate, ...prev.updates],
    } : prev);
  };

  const meta = improvementStatusMeta[initiative.status];
  const priorityMeta = improvementPriorityMeta[initiative.priority];

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* Pinned header */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">
        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/improvement')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} /> Register
          </button>
          <div className="flex items-center gap-2">
            <ImprovementStatusPill status={initiative.status} />
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
        {/* Entity header — priority color stripe */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: priorityMeta.color }} />
          <div className="flex-1 px-6 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-semibold text-ois-text-muted">{initiative.publicId}</span>
              <ImprovementCategoryChip category={initiative.category} />
            </div>
            <h1 className="text-xl font-bold text-ois-text leading-tight">{initiative.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-ois-text-muted flex-wrap">
              <span className="flex items-center gap-1.5">
                <ImprovementPriorityDot priority={initiative.priority} />
                <span style={{ color: priorityMeta.color }} className="font-semibold">{priorityMeta.label}</span>
              </span>
              <span>·</span>
              <span>Owner: <strong className="text-ois-text">{initiative.ownerName}</strong></span>
              {initiative.startedAt && (
                <>
                  <span>·</span>
                  <span>Started {formatDate(initiative.startedAt, 'MMM d, yyyy')}</span>
                </>
              )}
              {initiative.targetCompletionDate && (
                <>
                  <span>·</span>
                  <span>Target {formatDate(initiative.targetCompletionDate, 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body — 2 columns (no left sidebar) */}
      <div className="flex flex-1 min-h-0">

        {/* Center: pinned tab bar + scrollable content */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="border-b border-ois-border bg-white shrink-0 px-6">
            <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
              {tabsWithCount.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-ois-primary text-ois-primary font-bold'
                      : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'overview' && <OverviewTab initiative={initiative} />}
            {activeTab === 'progress' && <ProgressTab initiative={initiative} onLogUpdate={handleLogUpdate} />}
            {activeTab === 'metrics' && <MetricsTab initiative={initiative} />}
            {activeTab === 'roi' && <ROITab initiative={initiative} roiCalc={roiCalc} />}
            {activeTab === 'linked' && <LinkedItemsTab initiative={initiative} />}
            {activeTab === 'updates' && <UpdatesTab initiative={initiative} onAddUpdate={() => {}} />}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="At a glance">
            <div className="space-y-2">
              {[
                { label: 'Status', value: <ImprovementStatusPill status={initiative.status} /> },
                { label: 'Priority', value: <span style={{ color: priorityMeta.color }} className="text-xs font-semibold">{priorityMeta.label}</span> },
                { label: 'Category', value: <ImprovementCategoryChip category={initiative.category} /> },
                { label: 'Progress', value: <div className="w-24"><ImprovementProgressBar percent={initiative.progressPercent} /></div> },
                { label: 'Owner', value: <span className="text-xs text-ois-text">{initiative.ownerName}</span> },
                ...(initiative.startedAt ? [{ label: 'Started', value: <span className="text-xs text-ois-text">{formatDate(initiative.startedAt, 'MMM d, yyyy')}</span> }] : []),
                ...(initiative.targetCompletionDate ? [{ label: 'Target', value: <span className="text-xs text-ois-text">{formatDate(initiative.targetCompletionDate, 'MMM d, yyyy')}</span> }] : []),
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ois-text-subtle shrink-0">{row.label}</span>
                  <div className="text-right">{row.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <ROISummaryPanel initiative={initiative} roiCalc={roiCalc} onViewROI={() => setActiveTab('roi')} />

          <SectionCard title="Quick actions">
            <div className="space-y-1.5">
              <button
                onClick={() => setActiveTab('updates')}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left bg-ois-primary text-white hover:bg-ois-primary-hover"
              >
                Log update
              </button>
              <Link
                to="/improvement/kanban"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-text hover:bg-ois-surface-muted"
              >
                Move to Kanban <ArrowRight size={11} />
              </Link>
              <div className="pt-1 border-t border-ois-border">
                <button
                  disabled
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-left border border-ois-border text-ois-text-muted opacity-40 cursor-not-allowed"
                >
                  Mark as complete
                </button>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
};
