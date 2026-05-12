import { CheckCircle2, ArrowRight } from 'lucide-react';

const pastIncidents = [
  {
    id: 'pi-001',
    date: 'May 7',
    serviceName: 'Payment Service',
    title: 'Intermittent payment failures during peak traffic',
    duration: '1h 14m',
  },
  {
    id: 'pi-002',
    date: 'May 5',
    serviceName: 'Authentication',
    title: 'SSO login failures for enterprise accounts',
    duration: '23m',
  },
  {
    id: 'pi-003',
    date: 'May 2',
    serviceName: 'Search',
    title: 'Search index rebuild caused elevated response times',
    duration: '2h 08m',
  },
];

export function PastIncidentSummary() {
  return (
    <div>
      <div className="rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card divide-y divide-ois-border">
        {pastIncidents.map(incident => (
          <div key={incident.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ois-surface-muted transition-colors">
            <div className="min-w-0 flex-1 flex items-center gap-4">
              <span className="shrink-0 text-xs font-medium text-ois-text-subtle w-10">{incident.date}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ois-text">{incident.title}</p>
                <p className="text-xs text-ois-text-muted mt-0.5">{incident.serviceName}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex items-center gap-1 rounded-full bg-ois-success-pale px-2.5 py-0.5 text-xs font-medium text-ois-success">
                <CheckCircle2 size={10} /> Resolved
              </span>
              <span className="text-xs text-ois-text-subtle tabular-nums">{incident.duration}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-ois-primary hover:underline">
          View all past incidents <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
