import React, { useState, useMemo } from 'react';
import { Search, Plus, BookOpen, X, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { KnownErrorCard } from '@/src/components/problems/KnownErrorCard';
import { getKnownErrors } from '@/src/mocks/problems';
import { mockIncidents } from '@/src/mocks/incidents';
import { mockServices } from '@/src/mocks/services';
import { cn } from '@/src/lib/utils';

const HOT_SEARCHES = ['pool', 'connection', 'timeout', 'ssl', 'auth'];

const EFFECTIVENESS_OPTIONS = [
  { value: 'all', label: 'All effectiveness' },
  { value: 'full', label: 'Full workaround' },
  { value: 'partial', label: 'Partial workaround' },
  { value: 'none', label: 'No workaround' },
];

export const KEDB: React.FC = () => {
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [effectivenessFilter, setEffectivenessFilter] = useState('all');

  const knownErrors = getKnownErrors();

  const filtered = useMemo(() => {
    let result = [...knownErrors];
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.knownError?.rootCause?.toLowerCase().includes(q) ||
        p.knownError?.workaround?.toLowerCase().includes(q) ||
        p.affectedCIPublicIds.some(ci => ci.toLowerCase().includes(q)) ||
        p.affectedServiceIds.some(id => {
          const svc = mockServices.find(s => s.id === id);
          return svc?.name.toLowerCase().includes(q);
        })
      );
    }
    if (serviceFilter !== 'all') {
      result = result.filter(p => p.affectedServiceIds.includes(serviceFilter));
    }
    if (effectivenessFilter !== 'all') {
      result = result.filter(p => p.knownError?.workaroundEffectiveness === effectivenessFilter);
    }
    return result;
  }, [search, serviceFilter, effectivenessFilter, knownErrors]);

  const hasFilters = search || serviceFilter !== 'all' || effectivenessFilter !== 'all';
  const clearFilters = () => { setSearch(''); setServiceFilter('all'); setEffectivenessFilter('all'); };

  // Services that appear in known errors
  const relevantServiceIds = [...new Set(knownErrors.flatMap(p => p.affectedServiceIds))];

  return (
    <div className="space-y-6 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Known Error Database</h1>
          <p className="text-sm text-ois-text-muted mt-0.5">
            {knownErrors.length} known error{knownErrors.length !== 1 ? 's' : ''} · Search saves time during incident response
          </p>
        </div>
        <Link to="/problems">
          <Button variant="primary" size="sm" className="gap-1.5">
            <Plus size={14} />
            Add known error
          </Button>
        </Link>
      </div>

      {/* Prominent search */}
      <div className="bg-white border border-ois-border rounded-xl p-5 shadow-ois-card">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by symptom, error message, CI name…"
            autoFocus
            className="w-full h-12 pl-11 pr-4 text-base border border-ois-border rounded-xl bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-ois-text-subtle hover:text-ois-text">
              <X size={16} />
            </button>
          )}
        </div>

        {!search && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-ois-text-subtle">Most searched:</span>
            {HOT_SEARCHES.map(term => (
              <button
                key={term}
                onClick={() => setSearch(term)}
                className="text-xs px-2.5 py-1 rounded-full bg-ois-surface-muted border border-ois-border text-ois-text-muted hover:border-ois-primary hover:text-ois-primary transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
        >
          <option value="all">All services</option>
          {relevantServiceIds.map(id => {
            const svc = mockServices.find(s => s.id === id);
            return <option key={id} value={id}>{svc?.name ?? id}</option>;
          })}
        </select>

        <select
          value={effectivenessFilter}
          onChange={e => setEffectivenessFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
        >
          {EFFECTIVENESS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 h-9 px-3 text-sm text-ois-text-muted hover:text-ois-text border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors"
          >
            <X size={13} />
            Reset
          </button>
        )}

        <span className="ml-auto text-xs text-ois-text-subtle">
          {filtered.length} of {knownErrors.length} shown
        </span>
      </div>

      {/* Known error cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-ois-surface-muted flex items-center justify-center">
            <BookOpen size={28} className="text-ois-text-subtle" />
          </div>
          {knownErrors.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-ois-text">No known errors yet</h3>
              <p className="text-sm text-ois-text-muted max-w-sm">
                Promote a problem to Known Error status to populate the KEDB. L1/L2 agents will find workarounds here during incident response.
              </p>
              <Link to="/problems">
                <Button variant="primary" size="sm">Browse problems</Button>
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-ois-text">No results match your search</h3>
              <button onClick={clearFilters} className="text-sm text-ois-primary hover:underline">
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(problem => (
            <div key={problem.id} className="space-y-0">
              {/* Card header with problem ID */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ois-text-muted">KE-{problem.publicId}</span>
                  <span className="text-ois-border">·</span>
                  <span className="text-xs text-ois-text-muted">
                    {problem.relatedIncidentCount} related incident{problem.relatedIncidentCount !== 1 ? 's' : ''} in last 6 weeks
                  </span>
                  <span className="text-ois-border">·</span>
                  <span className="text-xs text-ois-text-muted">
                    Affected: {problem.affectedServiceIds.map(id => mockServices.find(s => s.id === id)?.name ?? id).join(', ')}
                  </span>
                </div>
                <Link
                  to={`/problems/${problem.publicId}`}
                  className="text-xs text-ois-primary hover:underline flex items-center gap-1"
                >
                  <Link2 size={11} />
                  View problem
                </Link>
              </div>

              {/* The reusable KnownErrorCard */}
              <KnownErrorCard problem={problem} />

              {/* Apply workaround CTA */}
              <div className="flex justify-end mt-2">
                <ApplyWorkaroundButton problemPublicId={problem.publicId} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Apply workaround to incident modal ───────────────────────────────────────

const ApplyWorkaroundButton: React.FC<{ problemPublicId: string }> = ({ problemPublicId }) => {
  const [open, setOpen] = useState(false);
  const [incidentId, setIncidentId] = useState('');

  const recentIncidents = useMemo(() => {
    return [...mockIncidents]
      .filter(i => !['resolved', 'closed'].includes(i.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg border border-ois-primary text-ois-primary hover:bg-ois-primary hover:text-white transition-colors font-medium"
      >
        Apply workaround to incident
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-ois-border rounded-lg px-3 py-2 shadow-sm">
      <select
        value={incidentId}
        onChange={e => setIncidentId(e.target.value)}
        className="text-xs border border-ois-border rounded-lg bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary text-ois-text"
      >
        <option value="">Select incident…</option>
        {recentIncidents.map(inc => (
          <option key={inc.id} value={inc.publicId}>
            {inc.publicId} — {inc.title.slice(0, 50)}{inc.title.length > 50 ? '…' : ''}
          </option>
        ))}
      </select>
      <Link
        to={incidentId ? `/incidents/${incidentId}` : '#'}
        className={cn(
          'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
          incidentId
            ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
            : 'bg-ois-surface-muted text-ois-text-subtle cursor-not-allowed pointer-events-none'
        )}
      >
        Apply
      </Link>
      <button onClick={() => setOpen(false)} className="text-ois-text-subtle hover:text-ois-text">
        <X size={13} />
      </button>
    </div>
  );
};
