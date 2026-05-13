import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { releasesService, useResource } from '../../services';
import { ReleaseCard } from '../../components/releases/ReleaseCard';
import { NewReleaseModal } from '../../components/releases/NewReleaseModal';
import { Release, ReleaseStatus, ReleaseType } from '../../types/release';
import { FilterDropdown } from '../../components/ui/FilterDropdown';
import { Can, useCurrentUser, filterReadable, releaseResource } from '@/src/lib/rbac';

interface ToastState { message: string; variant: 'success' | 'info' }
const Toast: React.FC<ToastState> = ({ message, variant }) => (
  <div className={cn(
    'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-none',
    variant === 'success' ? 'bg-ois-success text-white' : 'bg-ois-primary text-white',
  )}>
    {variant === 'success' && <CheckCircle2 size={15} />}
    {message}
  </div>
);

const STATUS_TABS: { label: string; value: ReleaseStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Planning', value: 'planning' },
  { label: 'In Validation', value: 'in_validation' },
  { label: 'Ready', value: 'ready' },
  { label: 'Released', value: 'released' },
  { label: 'Rolled Back', value: 'rolled_back' },
];

export const ReleasesList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReleaseType | 'all'>('all');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [newReleaseOpen, setNewReleaseOpen] = useState(false);
  const [extraReleases, setExtraReleases] = useState<Release[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user, applications, teams, departments } = useCurrentUser();
  const { data: releasesData } = useResource(() => releasesService.list(), []);
  const mockReleases = releasesData ?? [];
  const allReleases = useMemo(
    () => filterReadable(
      user,
      'release',
      [...extraReleases, ...mockReleases].map(r => ({ ...r, ...releaseResource(r) })),
    ) as Release[],
    [extraReleases, mockReleases, user, applications, teams, departments],
  );

  const showToast = (message: string, variant: ToastState['variant'] = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, variant });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return allReleases.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.publicId.toLowerCase().includes(q) ||
          r.componentName.toLowerCase().includes(q) ||
          r.version.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allReleases, search, statusFilter, typeFilter]);

  const active = allReleases.filter((r) => !['released', 'rolled_back', 'cancelled'].includes(r.status));
  const ready = allReleases.filter((r) => r.status === 'ready');
  const rolledBack = allReleases.filter((r) => r.status === 'rolled_back');

  const counts: Record<ReleaseStatus | 'all', number> = {
    all: allReleases.length,
    planning: allReleases.filter((r) => r.status === 'planning').length,
    locked: allReleases.filter((r) => r.status === 'locked').length,
    in_validation: allReleases.filter((r) => r.status === 'in_validation').length,
    ready: ready.length,
    deploying: allReleases.filter((r) => r.status === 'deploying').length,
    released: allReleases.filter((r) => r.status === 'released').length,
    partially_released: allReleases.filter((r) => r.status === 'partially_released').length,
    rolled_back: rolledBack.length,
    cancelled: allReleases.filter((r) => r.status === 'cancelled').length,
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-end gap-2">
        <Can module="release" action="create">
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setNewReleaseOpen(true)}>
            <Plus size={13} /> New release
          </Button>
        </Can>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search releases..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-ois-border-strong bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        <FilterDropdown
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as ReleaseType | 'all')}
          options={[
            { value: 'all', label: 'All types' },
            ...(['major', 'minor', 'patch', 'hotfix'] as ReleaseType[]).map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
          ]}
          placeholder="All types"
        />
        {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }}>
            Reset
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.filter((t) => counts[t.value] > 0 || t.value === 'all').map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              statusFilter === value
                ? 'bg-ois-primary text-white border-ois-primary'
                : 'bg-white border-ois-border text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
            )}
          >
            {label}
            <span className={cn('ml-1.5 text-[10px]', statusFilter === value ? 'text-white/70' : 'text-ois-text-subtle')}>
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Release cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <p className="text-sm font-bold text-ois-text mb-1">No releases match</p>
            <p className="text-xs text-ois-text-muted mb-3">Try adjusting your filters</p>
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }}>
              Reset filters
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <ReleaseCard key={r.id} release={r} />)}
        </div>
      )}

      <NewReleaseModal
        isOpen={newReleaseOpen}
        onClose={() => setNewReleaseOpen(false)}
        onCreate={(release) => {
          setExtraReleases((prev) => [release, ...prev]);
          showToast(`Created ${release.publicId} (${release.version})`, 'success');
        }}
      />

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </div>
  );
};
