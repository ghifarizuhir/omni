import { useState, useMemo } from 'react';
import { Button } from '@/src/components/ui/Button';
import { ThresholdRow } from '@/src/components/capacity/ThresholdRow';
import { ThresholdSeverityPill } from '@/src/components/capacity/ThresholdSeverityPill';
import { NewThresholdModal } from '@/src/components/capacity/NewThresholdModal';
import { mockCapacityMetrics } from '@/src/mocks/capacityMetrics';
import { mockCapacityThresholds } from '@/src/mocks/capacityThresholds';
import { CapacityThreshold, CapacityThresholdSeverity } from '@/src/types/capacity';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { useToast, ToastView } from '@/src/lib/useToast';

type StatusFilter = 'all' | 'enabled' | 'disabled';

export default function CapacityThresholds() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<CapacityThresholdSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [extraThresholds, setExtraThresholds] = useState<CapacityThreshold[]>([]);
  const { toast, showToast } = useToast();

  const allThresholds = useMemo(
    () => [...extraThresholds, ...mockCapacityThresholds],
    [extraThresholds],
  );

  const handleCreated = (threshold: CapacityThreshold) => {
    setExtraThresholds(prev => [threshold, ...prev]);
    showToast(`Threshold "${threshold.name}" created`, 'success');
  };

  const getEnabled = (id: string, fallback: boolean) => overrides[id] ?? fallback;

  const handleToggle = (id: string, enabled: boolean) => {
    setOverrides(prev => ({ ...prev, [id]: enabled }));
  };

  const handleReset = () => {
    setSearchQuery('');
    setSeverityFilter('all');
    setStatusFilter('all');
  };

  const filteredThresholds = useMemo(() => {
    return allThresholds
      .filter(t => {
        const isEnabled = getEnabled(t.id, t.enabled);
        if (statusFilter === 'enabled' && !isEnabled) return false;
        if (statusFilter === 'disabled' && isEnabled) return false;
        if (severityFilter !== 'all' && t.severity !== severityFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (
            !t.name.toLowerCase().includes(q) &&
            !t.publicId.toLowerCase().includes(q) &&
            !t.metricName.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.triggerCount30d - a.triggerCount30d);
  }, [allThresholds, searchQuery, severityFilter, statusFilter, overrides]);

  // Stats
  const totalEnabled = allThresholds.filter(t => getEnabled(t.id, t.enabled)).length;
  const totalDisabled = allThresholds.length - totalEnabled;
  const countBySeverity = (sev: CapacityThresholdSeverity) =>
    allThresholds.filter(t => t.severity === sev).length;

  const thresholdsWithEffectiveEnabled = filteredThresholds.map(t => ({
    ...t,
    enabled: getEnabled(t.id, t.enabled),
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capacity Thresholds</h1>
          <p className="mt-1 text-sm text-gray-500">
            {allThresholds.length} thresholds configured · {totalEnabled} enabled · 3 currently triggering
          </p>
        </div>
        <Button variant="default" size="sm" onClick={() => setIsModalOpen(true)}>
          + New threshold
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
          />
        </div>

        <FilterDropdown
          value={severityFilter}
          onChange={v => setSeverityFilter(v as CapacityThresholdSeverity | 'all')}
          options={[
            { value: 'all', label: 'Severity' },
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
            { value: 'critical', label: 'Critical' },
          ]}
          placeholder="Severity"
        />

        <FilterDropdown
          value={statusFilter}
          onChange={v => setStatusFilter(v as StatusFilter)}
          options={[
            { value: 'all', label: 'Status' },
            { value: 'enabled', label: 'Enabled' },
            { value: 'disabled', label: 'Disabled' },
          ]}
          placeholder="Status"
        />

        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Reset
        </button>
      </div>

      {/* Stats Strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setSeverityFilter('all')}
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            severityFilter === 'all' && statusFilter === 'all'
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          All {allThresholds.length}
        </button>

        {(['info', 'warning', 'critical'] as CapacityThresholdSeverity[]).map(sev => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              severityFilter === sev
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ThresholdSeverityPill severity={sev} size="sm" />
            {countBySeverity(sev)}
          </button>
        ))}

        <span className="w-px h-4 bg-gray-200" />

        <button
          onClick={() => setStatusFilter('enabled')}
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            statusFilter === 'enabled'
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Enabled {totalEnabled}
        </button>
        <button
          onClick={() => setStatusFilter('disabled')}
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            statusFilter === 'disabled'
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Disabled {totalDisabled}
        </button>
      </div>

      {/* Thresholds Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span className="w-32 shrink-0">ID</span>
          <span className="flex-1">Name / Metric</span>
          <span className="w-20 shrink-0">Severity</span>
          <span className="w-24 shrink-0">Condition</span>
          <span className="w-20 shrink-0">Duration</span>
          <span className="w-16 shrink-0 text-center">Auto-scale</span>
          <span className="w-16 shrink-0 text-center">Triggers (30d)</span>
          <span className="w-12 shrink-0 text-center">Status</span>
        </div>

        {/* Rows */}
        {thresholdsWithEffectiveEnabled.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No thresholds match the current filters.
          </div>
        ) : (
          thresholdsWithEffectiveEnabled.map(threshold => (
            <div key={threshold.id}>
              <ThresholdRow threshold={threshold} onToggle={handleToggle} />
            </div>
          ))
        )}
      </div>

      {/* New Threshold Modal */}
      <NewThresholdModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        metrics={mockCapacityMetrics}
        onCreated={handleCreated}
      />
      <ToastView toast={toast} />
    </div>
  );
}
