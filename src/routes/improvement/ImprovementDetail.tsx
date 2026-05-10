import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

export const ImprovementDetail: React.FC = () => {
  const { initiativeId } = useParams<{ initiativeId: string }>();
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
    <div className="flex flex-col min-h-full pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/improvement" className="inline-flex items-center gap-1 text-xs text-ois-text-muted hover:text-ois-primary transition-colors">
          <ArrowLeft size={13} /> Register
        </Link>
        <button className="w-8 h-8 rounded-lg hover:bg-ois-surface-muted flex items-center justify-center text-ois-text-muted">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Header */}
      <div className="border border-ois-border rounded-xl bg-ois-surface p-5 mb-5 shadow-ois-card">
        <div className="flex items-start gap-3 mb-3">
          <ImprovementCategoryChip category={initiative.category} />
          <ImprovementStatusPill status={initiative.status} />
        </div>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="font-mono text-xs font-semibold text-ois-text-muted">{initiative.publicId}</span>
          <h1 className="text-xl font-bold text-ois-text leading-tight">{initiative.title}</h1>
        </div>
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

      {/* Two-column layout */}
      <div className="flex gap-5 flex-1 min-h-0 items-start">
        {/* Center (65%) */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-ois-border mb-5 overflow-x-auto">
            {tabsWithCount.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-ois-primary text-ois-primary'
                    : 'border-transparent text-ois-text-muted hover:text-ois-text'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && <OverviewTab initiative={initiative} />}
          {activeTab === 'progress' && (
            <ProgressTab initiative={initiative} onLogUpdate={handleLogUpdate} />
          )}
          {activeTab === 'metrics' && <MetricsTab initiative={initiative} />}
          {activeTab === 'roi' && <ROITab initiative={initiative} roiCalc={roiCalc} />}
          {activeTab === 'linked' && <LinkedItemsTab initiative={initiative} />}
          {activeTab === 'updates' && <UpdatesTab initiative={initiative} onAddUpdate={() => {}} />}
        </div>

        {/* Right sidebar (35%) */}
        <div className="w-[280px] shrink-0 sticky top-4 space-y-3">
          {/* At a glance */}
          <div className="border border-ois-border rounded-lg bg-ois-surface overflow-hidden">
            <div className="px-3 py-2 bg-ois-surface-muted/50 border-b border-ois-border">
              <p className="text-[10px] font-bold text-ois-text-muted uppercase tracking-widest">At a glance</p>
            </div>
            <div className="px-3 py-3 space-y-2">
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
          </div>

          {/* ROI summary */}
          <ROISummaryPanel
            initiative={initiative}
            roiCalc={roiCalc}
            onViewROI={() => setActiveTab('roi')}
          />

          {/* Quick actions */}
          <div className="border border-ois-border rounded-lg bg-ois-surface overflow-hidden">
            <div className="px-3 py-2 bg-ois-surface-muted/50 border-b border-ois-border">
              <p className="text-[10px] font-bold text-ois-text-muted uppercase tracking-widest">Quick actions</p>
            </div>
            <div className="p-3 space-y-1.5">
              <button
                onClick={() => setActiveTab('updates')}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors flex items-center gap-2"
              >
                Log update
              </button>
              <Link
                to="/improvement/kanban"
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors flex items-center gap-2"
              >
                Move to Kanban <ArrowRight size={11} />
              </Link>
              <button className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ois-text-muted hover:bg-ois-surface-muted border border-ois-border/50 transition-colors flex items-center gap-2">
                Mark as complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
