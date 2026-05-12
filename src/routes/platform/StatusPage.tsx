import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, CheckCircle2, AlertTriangle, AlertOctagon, Wrench } from 'lucide-react';
import { mockStatusPageEntries, mockStatusPageIncidents } from '@/src/mocks';
import { deriveOverallStatus } from '@/src/components/status/StatusHero';
import { ServiceStatusRow } from '@/src/components/status/ServiceStatusRow';
import { StatusIncidentCard } from '@/src/components/status/StatusIncidentCard';
import { PastIncidentSummary } from '@/src/components/status/PastIncidentSummary';

const STATUS_ICON = {
  'All Systems Operational':       <CheckCircle2 size={20} />,
  'Partial Service Disruption':    <AlertTriangle size={20} />,
  'Major Outage':                  <AlertOctagon size={20} />,
  'Scheduled Maintenance':         <Wrench size={20} />,
};

export default function StatusPage() {
  const navigate = useNavigate();
  const entries = [...mockStatusPageEntries].sort((a, b) => a.displayOrder - b.displayOrder);
  const activeIncidents = mockStatusPageIncidents.filter(i => i.status !== 'resolved');
  const overall = deriveOverallStatus(entries);
  const affectedCount = entries.filter(e => e.status !== 'operational' && e.status !== 'maintenance').length;

  const mostRecent = [...entries].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0];
  const lastUpdatedAt = mostRecent
    ? new Date(mostRecent.lastUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' })
    : '—';
  const lastUpdatedBy = mostRecent?.lastUpdatedByName ?? 'System';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Header ── */}
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">

        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} />
            Platform
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ois-text-subtle">2026-05-08 08:52 UTC</span>
            <span className="flex items-center gap-1.5 rounded-full bg-ois-primary-pale px-2.5 py-1 text-xs font-medium text-ois-primary">
              <RotateCcw size={11} /> Auto-refreshing
            </span>
          </div>
        </div>

        {/* Status header — accent strip + overall status + meta */}
        <div className="flex items-stretch">
          <div
            className="w-1 shrink-0 transition-colors duration-500"
            style={{ backgroundColor: overall.accentColor }}
          />
          <div className="flex-1 px-6 py-4">
            <div className="flex items-center gap-2.5 mb-1">
              <span style={{ color: overall.accentColor }}>
                {STATUS_ICON[overall.label as keyof typeof STATUS_ICON] ?? <CheckCircle2 size={20} />}
              </span>
              <h1 className="text-xl font-bold" style={{ color: overall.textColor }}>
                {overall.label}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-ois-text-muted flex-wrap">
              {affectedCount > 0 && (
                <>
                  <span className="font-semibold" style={{ color: overall.textColor }}>
                    {affectedCount} service{affectedCount !== 1 ? 's' : ''} affected
                  </span>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                </>
              )}
              <span>Last updated {lastUpdatedAt} by {lastUpdatedBy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-8">

          {/* Service Status */}
          <section>
            <p className="mb-3 text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
              Service Status
            </p>
            <div className="rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card divide-y divide-ois-border">
              {entries.map(entry => (
                <ServiceStatusRow key={entry.id} entry={entry} />
              ))}
            </div>
          </section>

          {/* Active Incidents */}
          <section>
            <p className="mb-3 text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
              Active Incidents ({activeIncidents.length})
            </p>
            {activeIncidents.length === 0 ? (
              <div className="rounded-ois-card border border-ois-border bg-ois-surface px-6 py-5 text-center text-sm text-ois-text-muted shadow-ois-card">
                No active incidents at this time.
              </div>
            ) : (
              <div className="space-y-4">
                {activeIncidents.map(incident => (
                  <StatusIncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </section>

          {/* Past Incidents */}
          <section>
            <p className="mb-3 text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
              Past Incidents
            </p>
            <PastIncidentSummary />
          </section>

        </div>
      </div>
    </div>
  );
}
