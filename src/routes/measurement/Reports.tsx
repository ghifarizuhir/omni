import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { measurementService, useResource } from '@/src/services';
import { Report, ReportType, ReportFrequency } from '@/src/types/measurement';
import { reportTypeMeta } from '@/src/lib/constants';
import { ReportRow } from '@/src/components/measurement/ReportRow';
import { ReportGenerateModal } from '@/src/components/measurement/ReportGenerateModal';
import { ReportVersionsDrawer } from '@/src/components/measurement/ReportVersionsDrawer';
import { Button } from '@/src/components/ui/Button';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

const REPORT_TYPES: { value: ReportType | 'all'; label: string }[] = [
  { value: 'all',                 label: 'All types' },
  { value: 'monthly_summary',     label: 'Monthly Summary' },
  { value: 'sla_report',          label: 'SLA Report' },
  { value: 'incident_report',     label: 'Incident Report' },
  { value: 'change_report',       label: 'Change Report' },
  { value: 'availability_report', label: 'Availability Report' },
  { value: 'capacity_report',     label: 'Capacity Report' },
  { value: 'custom',              label: 'Custom' },
];

const FREQUENCIES: { value: ReportFrequency | 'all'; label: string }[] = [
  { value: 'all',       label: 'All frequencies' },
  { value: 'on_demand', label: 'On demand' },
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const FREQ_TAB_ORDER: (ReportFrequency | 'all')[] = ['all', 'monthly', 'weekly', 'quarterly', 'on_demand'];


export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useResource(() => measurementService.reports(), []);
  const mockReports = data ?? [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [freqFilter, setFreqFilter] = useState<ReportFrequency | 'all'>('all');
  const [generateReport, setGenerateReport] = useState<Report | null>(null);
  const [versionsReport, setVersionsReport] = useState<Report | null>(null);

  const filteredReports = useMemo(() => {
    return mockReports.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.publicId.toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (freqFilter !== 'all' && r.frequency !== freqFilter) return false;
      return true;
    });
  }, [search, typeFilter, freqFilter, mockReports]);

  const freqCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockReports.length };
    for (const r of mockReports) {
      counts[r.frequency] = (counts[r.frequency] ?? 0) + 1;
    }
    return counts;
  }, [mockReports]);

  const freqTabLabels: Record<string, string> = {
    all:       'All',
    monthly:   'Monthly',
    weekly:    'Weekly',
    quarterly: 'Quarterly',
    on_demand: 'On-demand',
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setFreqFilter('all');
  };

  const hasFilters = search !== '' || typeFilter !== 'all' || freqFilter !== 'all';

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-end gap-2">
        <Button variant="primary" size="sm" onClick={() => navigate('/reports/builder')}>
          <Plus size={14} className="mr-1" />
          New report
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" />
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-ois-border pl-9 pr-3 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
          />
        </div>

        <FilterDropdown
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as ReportType | 'all')}
          options={REPORT_TYPES.map((rt) => ({ value: rt.value, label: rt.label }))}
          placeholder="All types"
        />

        <FilterDropdown
          value={freqFilter}
          onChange={(v) => setFreqFilter(v as ReportFrequency | 'all')}
          options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
          placeholder="All frequencies"
        />

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-sm text-ois-text-subtle hover:text-ois-text transition-colors"
          >
            <X size={13} />
            Reset
          </button>
        )}
      </div>

      {/* Frequency Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {FREQ_TAB_ORDER.map((freq) => {
          const count = freqCounts[freq] ?? 0;
          if (freq !== 'all' && count === 0) return null;
          const isActive = freqFilter === freq;
          return (
            <button
              key={freq}
              onClick={() => setFreqFilter(freq)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-ois-primary text-white'
                  : 'bg-ois-surface-muted border border-ois-border text-ois-text-muted hover:bg-gray-100',
              )}
            >
              {freqTabLabels[freq]}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                isActive ? 'bg-white/20 text-white' : 'bg-white text-ois-text-muted',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-ois-border bg-ois-surface-muted">
              <th className="py-3 pl-4 pr-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">ID</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Name</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Type</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Frequency</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Last generated</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Next run</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Format</th>
              <th className="py-3 pr-4 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-sm text-ois-text-subtle">
                  No reports match your filters.{' '}
                  <button onClick={resetFilters} className="text-ois-primary hover:underline">Reset filters</button>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onGenerate={() => setGenerateReport(report)}
                  onViewVersions={() => setVersionsReport(report)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals / Drawers */}
      <ReportGenerateModal
        report={generateReport}
        onClose={() => setGenerateReport(null)}
        onGenerate={() => setGenerateReport(null)}
      />
      <ReportVersionsDrawer
        report={versionsReport}
        onClose={() => setVersionsReport(null)}
      />
    </div>
  );
};
