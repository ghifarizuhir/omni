import { mockStatusPageEntries, mockStatusPageIncidents } from '@/src/mocks';
import { StatusHero } from '@/src/components/status/StatusHero';
import { ServiceStatusRow } from '@/src/components/status/ServiceStatusRow';
import { StatusIncidentCard } from '@/src/components/status/StatusIncidentCard';
import { PastIncidentSummary } from '@/src/components/status/PastIncidentSummary';

export default function StatusPage() {
  const entries = [...mockStatusPageEntries].sort((a, b) => a.displayOrder - b.displayOrder);
  const activeIncidents = mockStatusPageIncidents.filter(i => i.status !== 'resolved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal top bar */}
      <header className="border-b border-gray-200 bg-white py-3 px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-blue-600">OIS</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-600">Internal Service Status</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">2026-05-08 08:52 UTC</span>
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
              🔄 Auto-refreshing
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Hero */}
        <StatusHero entries={entries} />

        {/* Service Status */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Service Status
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white px-6 shadow-sm">
            {entries.map(entry => (
              <ServiceStatusRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        {/* Active Incidents */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Active Incidents ({activeIncidents.length})
          </h2>
          {activeIncidents.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-center text-sm text-gray-500 shadow-sm">
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
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Past Incidents
          </h2>
          <PastIncidentSummary />
        </section>
      </main>
    </div>
  );
}
