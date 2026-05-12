import React from 'react';
import { Card } from '../ui/Card';
import { AlertOctagon, AlertTriangle, Activity, CheckCircle2, Clock, Eye } from 'lucide-react';
import { DonutChart } from '../charts/DonutChart';

interface EventStreamStatsRailProps {
  stats: {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    exception: number;
    warning: number;
    informational: number;
  };
}

export const EventStreamStatsRail: React.FC<EventStreamStatsRailProps> = ({ stats }) => {
  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="border border-ois-border rounded-ois-card bg-ois-surface overflow-hidden shadow-ois-card">
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Status Breakdown</p>
        </div>
        <div className="p-4 space-y-2">
          <StatusRow icon={<span className="w-2 h-2 rounded-full bg-ois-danger shrink-0" />} label="Open" value={stats.open} color="text-ois-danger" />
          <StatusRow icon={<span className="w-2 h-2 rounded-full bg-ois-warning shrink-0" />} label="Acknowledged" value={stats.acknowledged} color="text-ois-warning" />
          <StatusRow icon={<span className="w-2 h-2 rounded-full bg-ois-success shrink-0" />} label="Resolved" value={stats.resolved} color="text-ois-success" />
          <div className="pt-2 border-t border-ois-border mt-2">
            <StatusRow icon={<span className="w-2 h-2 rounded-full bg-ois-border-strong shrink-0" />} label="Total" value={stats.total} />
          </div>
        </div>
      </div>

      {/* Event type distribution */}
      <div className="border border-ois-border rounded-ois-card bg-ois-surface overflow-hidden shadow-ois-card">
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Event Distribution</p>
        </div>
        <div className="p-4">
          <div className="flex flex-col items-center">
            <DonutChart
              size={110}
              data={[
                { label: 'Exception', value: stats.exception, color: '#B42318' },
                { label: 'Warning', value: stats.warning, color: '#DC6803' },
                { label: 'Info', value: stats.informational, color: '#98A2B3' },
              ]}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            <TypeRow icon={<AlertOctagon size={13} className="text-ois-danger" />} label="Exception" value={stats.exception} />
            <TypeRow icon={<AlertTriangle size={13} className="text-ois-warning" />} label="Warning" value={stats.warning} />
            <TypeRow icon={<Activity size={13} className="text-ois-text-subtle" />} label="Informational" value={stats.informational} />
          </div>
        </div>
      </div>

      {/* Resolution velocity */}
      <div className="border border-ois-border rounded-ois-card bg-ois-surface overflow-hidden shadow-ois-card">
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Resolution Rate</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-ois-text">{resolutionRate}%</span>
            <span className="text-[11px] font-semibold text-ois-success uppercase tracking-wide">↑ 4% vs yday</span>
          </div>
          <div className="w-full h-1.5 bg-ois-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-ois-success rounded-full transition-all duration-500"
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
          <p className="text-xs text-ois-text-muted leading-relaxed">
            Events resolved within 1h of firing.
          </p>
        </div>
      </div>

      {/* Health insight */}
      <div className="border border-ois-primary/20 rounded-ois-card bg-ois-primary-pale overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-ois-primary shrink-0" />
            <span className="text-[11px] font-semibold text-ois-primary uppercase tracking-widest">Health Insight</span>
          </div>
          <p className="text-xs text-ois-text leading-relaxed">
            90% of current high-severity events correlate to a single root cause in the Payment Gateway.
          </p>
        </div>
      </div>
    </div>
  );
};

function StatusRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-ois-text-muted">{label}</span>
      </div>
      <span className={`text-xs font-semibold tabular-nums ${color ?? 'text-ois-text'}`}>{value}</span>
    </div>
  );
}

function TypeRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-ois-surface-muted transition-colors">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-ois-text-muted">{label}</span>
      </div>
      <span className="text-xs font-semibold text-ois-text tabular-nums">{value}</span>
    </div>
  );
}
