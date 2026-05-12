import { RotateCcw } from 'lucide-react';
import { mockStatusPageEntries, mockStatusPageIncidents } from '@/src/mocks';
import { StatusHero } from '@/src/components/status/StatusHero';
import { ServiceStatusRow } from '@/src/components/status/ServiceStatusRow';
import { StatusIncidentCard } from '@/src/components/status/StatusIncidentCard';
import { PastIncidentSummary } from '@/src/components/status/PastIncidentSummary';

export default function StatusPage() {
  const entries = [...mockStatusPageEntries].sort((a, b) => a.displayOrder - b.displayOrder);
  const activeIncidents = mockStatusPageIncidents.filter(i => i.status !== 'resolved');

  return (
    <div className="min-h-screen bg-ois-bg">
      {/* Top bar */}
      <header className="border-b border-ois-border bg-ois-surface py-3 px-6 shadow-ois-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-ois-primary">OIS</span>
            <span className="text-ois-border-strong">|</span>
            <span className="text-sm font-medium text-ois-text-muted">Internal Service Status</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ois-text-subtle">2026-05-08 08:52 UTC</span>
            <span className="flex items-center gap-1.5 rounded-full bg-ois-primary-pale px-2.5 py-1 text-xs font-medium text-ois-primary">
              <RotateCcw size={11} /> Auto-refreshing
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Hero */}
        <StatusHero entries={entries} />

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
      </main>
    </div>
  );
}
