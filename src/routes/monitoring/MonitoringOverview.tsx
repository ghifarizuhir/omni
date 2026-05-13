import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight, Radio, Shield, GitBranch,
  AlertOctagon, AlertTriangle, CheckCircle2,
  Eye, Activity,
} from 'lucide-react';
import { EventCard } from '../../components/monitoring/EventCard';
import { ConnectedSourcesPanel } from '../../components/platform/ConnectedSourcesPanel';
import { eventsService, useResource } from '../../services';
import { cn } from '../../lib/utils';

export const MonitoringOverview: React.FC = () => {
  const navigate = useNavigate();

  const { data: activeEvents } = useResource(() => eventsService.listActive(), []);
  const { data: stats } = useResource(() => eventsService.dashboardStats(), []);

  const events = activeEvents ?? [];
  const kpis = {
    active:         stats?.active ?? 0,
    p1Open:         stats?.p1Open ?? 0,
    p2Open:         stats?.p2Open ?? 0,
    unacknowledged: stats?.unacknowledged ?? 0,
  };
  const rulesStats = {
    total:    stats?.rules.total    ?? 0,
    enabled:  stats?.rules.enabled  ?? 0,
    disabled: stats?.rules.disabled ?? 0,
    firing:   stats?.rules.firing24h ?? 0,
  };
  const routingStats = {
    total:    stats?.routing.total    ?? 0,
    channels: stats?.routing.channels ?? 0,
  };
  const coverageStats = {
    covered: stats?.coverage.covered ?? 0,
    total:   stats?.coverage.total   ?? 0,
    pct:     stats?.coverage.pct     ?? 0,
  };

  const feedEvents = events.slice(0, 8);

  return (
    <div className="flex flex-1 min-h-0">

        {/* Main column */}
        <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5 space-y-5">

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Active Events"
              value={kpis.active}
              icon={<Activity size={16} />}
              color={kpis.active > 0 ? 'text-ois-danger' : 'text-ois-success'}
            />
            <KpiCard
              label="P1 Open"
              value={kpis.p1Open}
              icon={<AlertOctagon size={16} />}
              color={kpis.p1Open > 0 ? 'text-[#B42318]' : 'text-ois-success'}
              accent={kpis.p1Open > 0 ? '#FEF3F2' : undefined}
            />
            <KpiCard
              label="P2 Open"
              value={kpis.p2Open}
              icon={<AlertTriangle size={16} />}
              color={kpis.p2Open > 0 ? 'text-ois-warning' : 'text-ois-success'}
              accent={kpis.p2Open > 0 ? '#FFFAEB' : undefined}
            />
            <KpiCard
              label="Unacknowledged"
              value={kpis.unacknowledged}
              icon={<Eye size={16} />}
              color={kpis.unacknowledged > 0 ? 'text-ois-text' : 'text-ois-success'}
            />
          </div>

          {/* Active alerts feed */}
          <div>
            <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-3">
              Active Alerts
            </p>
            {feedEvents.length === 0 ? (
              <div className="text-center py-12 border border-ois-border rounded-ois-card bg-ois-surface">
                <CheckCircle2 size={36} className="mx-auto text-ois-success mb-3" />
                <p className="text-sm font-medium text-ois-text-muted">No active alerts — all clear.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => navigate(`/monitoring/events/${event.publicId}`)}
                  />
                ))}
                {events.length > feedEvents.length && (
                  <Link
                    to="/monitoring/events"
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-ois-card border border-ois-border bg-ois-surface text-xs font-medium text-ois-primary hover:bg-ois-surface-muted transition-colors"
                  >
                    View all {events.length} active events <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right health rail */}
        <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-l border-ois-border overflow-y-auto bg-ois-surface p-4 gap-4">

          {/* Rules */}
          <div className="border border-ois-border rounded-ois-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
              <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Rules</p>
              <Shield size={12} className="text-ois-text-subtle" />
            </div>
            <div className="p-4 space-y-2.5">
              <HealthRow label="Total" value={rulesStats.total} />
              <HealthRow label="Enabled" value={rulesStats.enabled} valueColor="text-ois-success" />
              <HealthRow label="Disabled" value={rulesStats.disabled} valueColor="text-ois-text-subtle" />
              <HealthRow
                label="Firing (24h)"
                value={rulesStats.firing}
                valueColor={rulesStats.firing > 0 ? 'text-ois-warning' : 'text-ois-success'}
              />
              <Link
                to="/monitoring/rules"
                className="flex items-center gap-1 text-xs font-medium text-ois-primary hover:underline mt-1 pt-2 border-t border-ois-border"
              >
                Manage rules <ArrowRight size={11} />
              </Link>
            </div>
          </div>

          {/* Routing */}
          <div className="border border-ois-border rounded-ois-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
              <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Alert Routing</p>
              <GitBranch size={12} className="text-ois-text-subtle" />
            </div>
            <div className="p-4 space-y-2.5">
              <HealthRow label="Routes" value={routingStats.total} />
              <HealthRow label="Channels" value={routingStats.channels} />
              <Link
                to="/monitoring/routing"
                className="flex items-center gap-1 text-xs font-medium text-ois-primary hover:underline mt-1 pt-2 border-t border-ois-border"
              >
                Configure routing <ArrowRight size={11} />
              </Link>
            </div>
          </div>

          {/* Connected sources */}
          <ConnectedSourcesPanel domain="monitoring" variant="rail" />

          {/* Coverage */}
          <div className="border border-ois-border rounded-ois-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
              <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Coverage</p>
              <Radio size={12} className="text-ois-text-subtle" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-end justify-between">
                <span
                  className={cn(
                    'text-3xl font-bold tabular-nums',
                    coverageStats.pct >= 80 ? 'text-ois-success' :
                    coverageStats.pct >= 60 ? 'text-ois-warning' : 'text-ois-danger'
                  )}
                >
                  {coverageStats.pct}%
                </span>
                <span className="text-xs text-ois-text-subtle">{coverageStats.covered}/{coverageStats.total} CIs</span>
              </div>
              <div className="w-full h-1.5 bg-ois-surface-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    coverageStats.pct >= 80 ? 'bg-ois-success' :
                    coverageStats.pct >= 60 ? 'bg-ois-warning' : 'bg-ois-danger'
                  )}
                  style={{ width: `${coverageStats.pct}%` }}
                />
              </div>
              <Link
                to="/monitoring/coverage"
                className="flex items-center gap-1 text-xs font-medium text-ois-primary hover:underline pt-1 border-t border-ois-border"
              >
                View coverage report <ArrowRight size={11} />
              </Link>
            </div>
          </div>

        </aside>
    </div>
  );
};

// ── Local components ─────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  accent?: string;
}> = ({ label, value, icon, color = 'text-ois-text', accent }) => (
  <div
    className="rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card p-4 flex flex-col gap-2"
    style={accent ? { backgroundColor: accent } : undefined}
  >
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</span>
      <span className={cn('opacity-60', color)}>{icon}</span>
    </div>
    <span className={cn('text-3xl font-bold tabular-nums leading-none', color)}>{value}</span>
  </div>
);

const HealthRow: React.FC<{ label: string; value: number | string; valueColor?: string }> = ({
  label, value, valueColor = 'text-ois-text',
}) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-ois-text-muted">{label}</span>
    <span className={cn('font-semibold tabular-nums', valueColor)}>{value}</span>
  </div>
);
