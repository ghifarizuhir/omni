import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ArrowRight, Plus, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { mockReports } from '@/src/mocks/reports';
import { Report, ReportType, ReportFrequency } from '@/src/types/measurement';
import { reportTypeMeta } from '@/src/lib/constants';
import { ReportRow } from '@/src/components/measurement/ReportRow';
import { ReportGenerateModal } from '@/src/components/measurement/ReportGenerateModal';
import { ReportVersionsDrawer } from '@/src/components/measurement/ReportVersionsDrawer';
import { Button } from '@/src/components/ui/Button';

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

function formatLastGen(isoStr?: string): string {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export const Reports: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [freqFilter, setFreqFilter] = useState<ReportFrequency | 'all'>('all');
  const [generateReport, setGenerateReport] = useState<Report | null>(null);
  const [versionsReport, setVersionsReport] = useState<Report | null>(null);

  const scheduledCount = useMemo(
    () => mockReports.filter((r) => r.frequency !== 'on_demand').length,
    [],
  );

  const lastGen = useMemo(() => {
    const dates = mockReports
      .filter((r) => r.lastGeneratedAt)
      .map((r) => new Date(r.lastGeneratedAt!).getTime());
    if (!dates.length) return '—';
    return formatLastGen(new Date(Math.max(...dates)).toISOString());
  }, []);

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
  }, [search, typeFilter, freqFilter]);

  const freqCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockReports.length };
    for (const r of mockReports) {
      counts[r.frequency] = (counts[r.frequency] ?? 0) + 1;
    }
    return counts;
  }, []);

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
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Reports</h1>
          <p className="mt-0.5 text-sm text-ois-text-subtle">
            {mockReports.length} reports · {scheduledCount} scheduled · Last generated: {lastGen}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/metrics/catalog"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ois-border bg-white px-3 py-2 text-sm font-medium text-ois-text hover:bg-ois-surface-muted transition-colors"
          >
            Metric Catalog
            <ArrowRight size={14} />
          </Link>
          <Button variant="primary" size="sm" onClick={() => navigate('/reports/builder')}>
            <Plus size={14} className="mr-1" />
            New report
          </Button>
        </div>
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

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ReportType | 'all')}
          className="h-9 rounded-lg border border-ois-border bg-white px-3 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
        >
          {REPORT_TYPES.map((rt) => (
            <option key={rt.value} value={rt.value}>{rt.label}</option>
          ))}
        </select>

        <select
          value={freqFilter}
          onChange={(e) => setFreqFilter(e.target.value as ReportFrequency | 'all')}
          className="h-9 rounded-lg border border-ois-border bg-white px-3 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
        >
          {FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

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
              <th className="py-3 pl-4 pr-3 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">ID</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Name</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Type</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Frequency</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Last generated</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Next run</th>
              <th className="py-3 pr-3 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Format</th>
              <th className="py-3 pr-4 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Actions</th>
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
