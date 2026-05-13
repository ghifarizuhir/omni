import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Download, X, Check, Minus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { availabilityService, servicesService, useResource } from '@/src/services';
import { Outage, OutageType } from '@/src/types';
import { formatRelative } from '@/src/lib/format';
import { Card, CardBody } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { SeverityBadge } from '@/src/components/ui/StatusSeverityBadges';
import { OutageTypeChip } from '@/src/components/availability/OutageTypeChip';
import { OutageVolumeBarChart } from '@/src/components/availability/OutageVolumeBarChart';
import { OutageCausesPieChart } from '@/src/components/availability/OutageCausesPieChart';
import { OutageDetailDrawer } from '@/src/components/availability/OutageDetailDrawer';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

function formatDuration(minutes?: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type TypeFilter = 'all' | OutageType;

const TYPE_TABS: Array<{ label: string; value: TypeFilter; count: number }> = [
  { label: 'All', value: 'all', count: 24 },
  { label: 'Unplanned', value: 'unplanned', count: 16 },
  { label: 'Planned', value: 'planned', count: 5 },
  { label: 'Partial', value: 'partial', count: 2 },
  { label: 'Detected', value: 'detected_only', count: 1 },
];

export const Outages: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialService = searchParams.get('service') ?? 'all';

  const { data: outagesData } = useResource(() => availabilityService.outages(), []);
  const { data: servicesData } = useResource(() => servicesService.list(), []);
  const mockOutages = outagesData ?? [];
  const mockServices = servicesData ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [serviceFilter, setServiceFilter] = useState(initialService);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [customerFacingFilter, setCustomerFacingFilter] = useState('all');
  const [selectedOutage, setSelectedOutage] = useState<Outage | null>(null);

  const serviceOptions = useMemo(
    () => [{ id: 'all', name: 'All Services' }, ...mockServices.map((s) => ({ id: s.id, name: s.name }))],
    [mockServices],
  );

  const sortedOutages = useMemo(
    () =>
      [...mockOutages].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    [mockOutages],
  );

  const filteredOutages = useMemo(() => {
    return sortedOutages.filter((o) => {
      const matchesSearch =
        !searchQuery ||
        o.publicId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || o.type === typeFilter;
      const matchesService = serviceFilter === 'all' || o.serviceId === serviceFilter;
      const matchesSeverity = severityFilter === 'all' || o.severity === severityFilter;
      const matchesCustomer =
        customerFacingFilter === 'all' ||
        (customerFacingFilter === 'yes' && o.customerFacing) ||
        (customerFacingFilter === 'no' && !o.customerFacing);
      return matchesSearch && matchesType && matchesService && matchesSeverity && matchesCustomer;
    });
  }, [sortedOutages, searchQuery, typeFilter, serviceFilter, severityFilter, customerFacingFilter]);

  const hasFilters =
    searchQuery ||
    typeFilter !== 'all' ||
    serviceFilter !== 'all' ||
    severityFilter !== 'all' ||
    customerFacingFilter !== 'all';

  const handleReset = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setServiceFilter('all');
    setSeverityFilter('all');
    setCustomerFacingFilter('all');
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm">
          Last 90d
          <span className="ml-1 text-gray-400">▾</span>
        </Button>
        <Button variant="secondary" size="sm">
          <Download size={14} className="mr-1" />
          Export
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-200"
          />
        </div>

        <FilterDropdown
          value={typeFilter}
          onChange={v => setTypeFilter(v as TypeFilter)}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'unplanned', label: 'Unplanned' },
            { value: 'planned', label: 'Planned' },
            { value: 'partial', label: 'Partial' },
            { value: 'detected_only', label: 'Detected Only' },
          ]}
          placeholder="All Types"
        />

        <FilterDropdown
          value={serviceFilter}
          onChange={v => setServiceFilter(v)}
          options={serviceOptions.map(s => ({ value: s.id, label: s.name }))}
          placeholder="All Services"
        />

        <FilterDropdown
          value={severityFilter}
          onChange={v => setSeverityFilter(v)}
          options={[
            { value: 'all', label: 'All Severities' },
            { value: 'P1', label: 'P1' },
            { value: 'P2', label: 'P2' },
            { value: 'P3', label: 'P3' },
            { value: 'P4', label: 'P4' },
          ]}
          placeholder="All Severities"
        />

        <FilterDropdown
          value={customerFacingFilter}
          onChange={v => setCustomerFacingFilter(v)}
          options={[
            { value: 'all', label: 'Customer-facing: All' },
            { value: 'yes', label: 'Customer-facing: Yes' },
            { value: 'no', label: 'Customer-facing: No' },
          ]}
          placeholder="Customer-facing: All"
        />

        {hasFilters && (
          <button
            onClick={handleReset}
            className="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            <X size={13} />
            Reset
          </button>
        )}
      </div>

      {/* Stats Strip */}
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTypeFilter(tab.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              typeFilter === tab.value
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                typeFilter === tab.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
        {(['P1', 'P2', 'P3', 'P4'] as const).map((sev, i) => {
          const counts = [4, 8, 9, 3];
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                severityFilter === sev
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {sev}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  severityFilter === sev ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
                )}
              >
                {counts[i]}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setCustomerFacingFilter(customerFacingFilter === 'yes' ? 'all' : 'yes')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            customerFacingFilter === 'yes'
              ? 'border-primary-300 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
          )}
        >
          Customer-facing
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              customerFacingFilter === 'yes' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
            )}
          >
            14
          </span>
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="px-5 py-4 border-b border-ois-border">
            <h2 className="text-sm font-semibold text-ois-text">Outage Volume by Week</h2>
          </div>
          <CardBody>
            <OutageVolumeBarChart outages={mockOutages} />
          </CardBody>
        </Card>
        <Card>
          <div className="px-5 py-4 border-b border-ois-border">
            <h2 className="text-sm font-semibold text-ois-text">Outage Causes</h2>
          </div>
          <CardBody>
            <OutageCausesPieChart outages={mockOutages} />
          </CardBody>
        </Card>
      </div>

      {/* Outages Table */}
      <Card>
        <div className="px-5 py-4 border-b border-ois-border">
          <h2 className="text-sm font-semibold text-ois-text">
            Outages
            <span className="ml-2 text-xs font-normal text-ois-text-subtle">
              {filteredOutages.length} result{filteredOutages.length !== 1 ? 's' : ''}
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ois-border bg-ois-surface-muted">
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Service
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Sev
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Customer?
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Triggered by
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {filteredOutages.map((o) => {
                const isOngoing = !o.endedAt;
                const ongoingDuration = isOngoing
                  ? Math.floor(
                      (new Date().getTime() - new Date(o.startedAt).getTime()) / 60000,
                    )
                  : undefined;

                return (
                  <tr
                    key={o.id}
                    className={cn(
                      'hover:bg-ois-surface-muted transition-colors',
                      isOngoing && 'bg-red-50',
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-ois-text-subtle">{o.publicId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <OutageTypeChip type={o.type} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-ois-text">{o.serviceName}</td>
                    <td className="px-4 py-3 text-sm text-ois-text-subtle" title={o.startedAt}>
                      {formatRelative(o.startedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {isOngoing ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          {ongoingDuration !== undefined
                            ? `ongoing ${formatDuration(ongoingDuration)}`
                            : 'ongoing'}
                        </span>
                      ) : (
                        <span className="text-sm text-ois-text-subtle">
                          {formatDuration(o.durationMinutes)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={o.severity} />
                    </td>
                    <td className="px-4 py-3">
                      {o.customerFacing ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Minus size={14} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {o.triggeringIncidentPublicId && o.triggeringIncidentId ? (
                        <Link
                          to={`/incidents/${o.triggeringIncidentId}`}
                          className="text-xs font-mono text-primary-600 hover:underline"
                        >
                          {o.triggeringIncidentPublicId}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOutage(o)}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredOutages.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    No outages match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Drawer */}
      <OutageDetailDrawer
        outage={selectedOutage}
        isOpen={!!selectedOutage}
        onClose={() => setSelectedOutage(null)}
      />
    </div>
  );
};
