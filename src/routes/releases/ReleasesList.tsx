import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, GitMerge, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { mockReleases } from '../../mocks';
import { ReleaseCard } from '../../components/releases/ReleaseCard';
import { ReleaseStatus, ReleaseType } from '../../types/release';

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
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReleaseType | 'all'>('all');
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, variant: ToastState['variant'] = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, variant });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return mockReleases.filter((r) => {
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
  }, [search, statusFilter, typeFilter]);

  const active = mockReleases.filter((r) => !['released', 'rolled_back', 'cancelled'].includes(r.status));
  const ready = mockReleases.filter((r) => r.status === 'ready');
  const rolledBack = mockReleases.filter((r) => r.status === 'rolled_back');

  const counts: Record<ReleaseStatus | 'all', number> = {
    all: mockReleases.length,
    planning: mockReleases.filter((r) => r.status === 'planning').length,
    locked: mockReleases.filter((r) => r.status === 'locked').length,
    in_validation: mockReleases.filter((r) => r.status === 'in_validation').length,
    ready: ready.length,
    deploying: mockReleases.filter((r) => r.status === 'deploying').length,
    released: mockReleases.filter((r) => r.status === 'released').length,
    partially_released: mockReleases.filter((r) => r.status === 'partially_released').length,
    rolled_back: rolledBack.length,
    cancelled: mockReleases.filter((r) => r.status === 'cancelled').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Releases</h1>
          <p className="text-sm text-ois-text-muted mt-0.5">
            {mockReleases.length} total · {active.length} active ·{' '}
            {ready.length > 0 && <span className="text-ois-primary font-semibold">{ready.length} ready for prod approval · </span>}
            {rolledBack.length} rolled back this quarter
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate('/releases/pipeline')}>
            <GitMerge size={13} /> Pipeline view
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate('/releases/notes')}>
            <FileText size={13} /> Notes archive
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => showToast('New release form coming soon', 'info')}>
            <Plus size={13} /> New release
          </Button>
        </div>
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
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ReleaseType | 'all')}
          className="h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/20"
        >
          <option value="all">All types</option>
          {(['major', 'minor', 'patch', 'hotfix'] as ReleaseType[]).map((t) => (
            <option key={t} value={t} className="capitalize">{t}</option>
          ))}
        </select>
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

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </div>
  );
};
