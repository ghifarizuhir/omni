const pastIncidents = [
  {
    id: 'pi-001',
    date: 'May 7',
    serviceName: 'Payment Service',
    title: 'Intermittent payment failures during peak traffic',
    status: 'Resolved',
    duration: '1h 14m',
  },
  {
    id: 'pi-002',
    date: 'May 5',
    serviceName: 'Authentication',
    title: 'SSO login failures for enterprise accounts',
    status: 'Resolved',
    duration: '23m',
  },
  {
    id: 'pi-003',
    date: 'May 2',
    serviceName: 'Search',
    title: 'Search index rebuild caused elevated response times',
    status: 'Resolved',
    duration: '2h 08m',
  },
];

export function PastIncidentSummary() {
  return (
    <div>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
        {pastIncidents.map(incident => (
          <div key={incident.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs font-medium text-gray-400 w-10">
                  {incident.date}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{incident.title}</p>
                  <p className="text-xs text-gray-500">{incident.serviceName}</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {incident.status}
              </span>
              <span className="text-xs text-gray-400">{incident.duration}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
          View all past incidents →
        </button>
      </div>
    </div>
  );
}
