import React, { useState, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { availabilityService, servicesService, useResource } from '@/src/services';
import { SLACard as SLACardBase } from '@/src/components/availability/SLACard';
import { Button } from '@/src/components/ui/Button';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { AvailabilitySLAStatus, SLATarget, SLABreach } from '@/src/types';
import { Can } from '@/src/lib/rbac';

const SLACard: React.FC<{ sla: SLATarget; breach?: SLABreach }> = (props) => (
  <SLACardBase {...props} />
);

type StatusFilter = 'all' | AvailabilitySLAStatus;

export const SLATargets: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  const { data: slaData } = useResource(() => availabilityService.slaTargets(), []);
  const { data: breachesData } = useResource(() => availabilityService.slaBreaches(), []);
  const { data: servicesData } = useResource(() => servicesService.list(), []);
  const mockSLATargets = slaData ?? [];
  const mockSLABreaches = breachesData ?? [];

  const STATUS_TABS = useMemo(() => {
    const t = mockSLATargets;
    const by = (s: string) => t.filter(x => x.status === s).length;
    return [
      { label: 'All', value: 'all' as StatusFilter, count: t.length },
      { label: 'Meeting', value: 'meeting' as StatusFilter, count: by('meeting') },
      { label: 'At Risk', value: 'at_risk' as StatusFilter, count: by('at_risk') },
      { label: 'Breached', value: 'breached' as StatusFilter, count: by('breached') },
    ];
  }, [mockSLATargets]);
  const mockServices = servicesData ?? [];

  const serviceOptions = useMemo(
    () => [{ id: 'all', name: 'All Services' }, ...mockServices.map((s) => ({ id: s.id, name: s.name }))],
    [mockServices],
  );

  const filteredSLAs = useMemo(() => {
    return mockSLATargets.filter((sla) => {
      const matchesSearch =
        !searchQuery ||
        sla.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sla.publicId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sla.status === statusFilter;
      const matchesService = serviceFilter === 'all' || sla.serviceId === serviceFilter;
      return matchesSearch && matchesStatus && matchesService;
    });
  }, [mockSLATargets, searchQuery, statusFilter, serviceFilter]);

  const getBreachForSLA = (slaId: string) =>
    mockSLABreaches.find((b) => b.slaId === slaId && b.status === 'active');

  const handleReset = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setServiceFilter('all');
  };

  const hasFilters = searchQuery || statusFilter !== 'all' || serviceFilter !== 'all';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        <Can module="availability" action="update">
          <Button variant="primary" size="sm">
            <Plus size={14} className="mr-1" />
            New SLA Target
          </Button>
        </Can>
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
          value={serviceFilter}
          onChange={v => setServiceFilter(v)}
          options={serviceOptions.map(s => ({ value: s.id, label: s.name }))}
          placeholder="All Services"
        />

        <FilterDropdown
          value={statusFilter}
          onChange={v => setStatusFilter(v as StatusFilter)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'meeting', label: 'Meeting' },
            { value: 'at_risk', label: 'At Risk' },
            { value: 'breached', label: 'Breached' },
          ]}
          placeholder="All Statuses"
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
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === tab.value
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                statusFilter === tab.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* SLA Cards */}
      {filteredSLAs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSLAs.map((sla) => {
            const breach = getBreachForSLA(sla.id);
            return <SLACard key={sla.id} sla={sla} breach={breach} />;
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">No SLAs match your filters.</p>
          <button
            onClick={handleReset}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
};
