import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { releasesService, useResource } from '../../services';
import { ReleaseTypeChip } from '../../components/releases/ReleaseTypeChip';
import { formatDate } from '../../lib/format';
import { ReleaseType } from '../../types/release';
import { FilterDropdown } from '../../components/ui/FilterDropdown';

export const ReleaseNotes: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [component, setComponent] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<ReleaseType | 'all'>('all');

  const { data: releasesData } = useResource(() => releasesService.list(), []);
  const PUBLISHED = useMemo(() =>
    (releasesData ?? []).filter((r) => r.status === 'released')
      .sort((a, b) => new Date(b.actualReleaseDate ?? b.plannedReleaseDate).getTime() -
                      new Date(a.actualReleaseDate ?? a.plannedReleaseDate).getTime()),
  [releasesData]);

  const components = ['all', ...Array.from(new Set(PUBLISHED.map((r) => r.componentName)))];

  const filtered = useMemo(() =>
    PUBLISHED.filter((r) => {
      if (component !== 'all' && r.componentName !== component) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.version.toLowerCase().includes(q) ||
          r.componentName.toLowerCase().includes(q) ||
          r.releaseNotes.toLowerCase().includes(q);
      }
      return true;
    }),
  [PUBLISHED, search, component, typeFilter]);

  return (
    <div className="space-y-5 max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-end">
        <div className="relative w-56 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-ois-border-strong bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <FilterDropdown
          value={component}
          onChange={(v) => setComponent(v)}
          options={components.map((c) => ({ value: c, label: c === 'all' ? 'All components' : c }))}
          placeholder="All components"
        />
        <FilterDropdown
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as ReleaseType | 'all')}
          options={[
            { value: 'all', label: 'All types' },
            ...(['major', 'minor', 'patch', 'hotfix'] as ReleaseType[]).map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
          ]}
          placeholder="All types"
        />
        {(search || component !== 'all' || typeFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSearch(''); setComponent('all'); setTypeFilter('all'); }}>
            Reset
          </Button>
        )}
      </div>

      {/* Notes feed */}
      {filtered.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <p className="text-sm font-bold text-ois-text mb-1">No release notes match</p>
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setComponent('all'); setTypeFilter('all'); }}>
              Reset
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-0 divide-y divide-ois-border border border-ois-border rounded-xl overflow-hidden">
          {filtered.map((release) => (
            <div key={release.id} className="bg-white p-6">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex items-center gap-2">
                  <ReleaseTypeChip type={release.type} />
                  <h2 className="text-base font-bold text-ois-text">
                    {release.componentName} {release.version}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-ois-text-muted">
                    Released {formatDate(release.actualReleaseDate ?? release.plannedReleaseDate, 'MMM d')}
                  </p>
                  <p className="font-mono text-[10px] text-ois-text-subtle">{release.publicId}</p>
                </div>
              </div>

              {release.name && (
                <p className="text-sm text-ois-text-muted mb-4">{release.name}</p>
              )}

              {/* Notes content */}
              <div className="prose prose-sm max-w-none text-ois-text">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ois-text">
                  {release.releaseNotes}
                </pre>
              </div>

              <div className="mt-4 pt-4 border-t border-ois-border">
                <button
                  onClick={() => navigate(`/releases/${release.publicId}`)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-ois-primary hover:underline"
                >
                  View release detail <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
