import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/src/components/ui/Badge';
import { cn } from '@/src/lib/utils';
import { applicationCatalogApi, CatalogAppDto } from '@/src/services/adminService';
import { teamsService, useResource } from '@/src/services';

type Filter = 'all' | 'member' | 'not-member';

const CRITICALITY_COLOR: Record<string, string> = {
  critical:     'bg-red-100 text-red-700 border-red-200',
  high:         'bg-orange-100 text-orange-700 border-orange-200',
  medium:       'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:          'bg-green-100 text-green-700 border-green-200',
};

export const ApplicationCatalog: React.FC = () => {
  const [apps, setApps] = useState<CatalogAppDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data: teams } = useResource(() => teamsService.list(), []);

  useEffect(() => {
    setLoading(true);
    applicationCatalogApi.list()
      .then(setApps)
      .catch(e => setError(e?.message ?? 'Failed to load applications'))
      .finally(() => setLoading(false));
  }, []);

  const teamName = (id: string) =>
    teams?.find(t => t.id === id)?.name ?? id;

  const filtered = apps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.code.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'member' && app.isMember) ||
      (filter === 'not-member' && !app.isMember);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ois-text">Application Catalog</h1>
        <p className="mt-1 text-sm text-ois-text-muted">
          Browse all applications in this tenant. Contact an Application Owner to request access.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-ois-surface-muted rounded-ois-btn border border-ois-border focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/20 text-sm transition-all outline-none"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {(['all', 'member', 'not-member'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                filter === f
                  ? 'bg-ois-primary text-white border-ois-primary'
                  : 'bg-ois-surface-muted text-ois-text-muted border-ois-border hover:bg-ois-border',
              )}
            >
              {f === 'all' ? 'All' : f === 'member' ? 'Member' : 'Not a member'}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="text-sm text-ois-text-muted py-12 text-center">Loading applications…</div>
      )}

      {!loading && error && (
        <div className="text-sm text-ois-danger py-12 text-center">{error}</div>
      )}

      {!loading && !error && apps.length === 0 && (
        <div className="text-sm text-ois-text-muted py-12 text-center">
          No applications found in this tenant.
        </div>
      )}

      {!loading && !error && apps.length > 0 && filtered.length === 0 && (
        <div className="text-sm text-ois-text-muted py-12 text-center">
          No applications match your search or filter.
        </div>
      )}

      {/* Card grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(app => (
            <div
              key={app.id}
              className="bg-white border border-ois-border rounded-ois-card p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Top row: code badge + name */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-ois-primary-pale text-ois-primary border border-ois-primary/20 mb-1.5">
                    {app.code}
                  </span>
                  <p className="text-sm font-semibold text-ois-text leading-tight truncate" title={app.name}>
                    {app.name}
                  </p>
                </div>
              </div>

              {/* Criticality */}
              {app.criticality && (
                <div>
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                      CRITICALITY_COLOR[app.criticality.toLowerCase()] ?? 'bg-gray-100 text-gray-600 border-gray-200',
                    )}
                  >
                    {app.criticality}
                  </span>
                </div>
              )}

              {/* Owner teams */}
              {app.ownerTeamIds.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ois-text-subtle mb-1">Owner teams</p>
                  <div className="flex flex-wrap gap-1">
                    {app.ownerTeamIds.map(tid => (
                      <span key={tid} className="px-2 py-0.5 rounded-full bg-ois-surface-muted text-[11px] text-ois-text-muted border border-ois-border">
                        {teamName(tid)}
                      </span>
                    ))}
                  </div>
                  {/* TODO: add "Contact owners" mailto button once we have a clean team → primary user email concept */}
                </div>
              )}

              {/* Membership pill */}
              <div className="mt-auto pt-1">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                    app.isMember
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200',
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', app.isMember ? 'bg-green-500' : 'bg-gray-400')} />
                  {app.isMember ? "You're a member" : 'Not a member'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
