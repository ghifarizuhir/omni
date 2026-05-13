import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { OverrideCard } from '@/src/components/oncall/OverrideCard';
import { RequestOverrideModal } from '@/src/components/oncall/RequestOverrideModal';
import { onCallService, useResource } from '@/src/services';
import { OnCallOverride } from '@/src/types/platform';
import { Can } from '@/src/lib/rbac';

export const OnCallOverrides: React.FC = () => {
  const { data: schedulesData } = useResource(() => onCallService.schedules(), []);
  const { data: overridesData } = useResource(() => onCallService.overrides(), []);
  const schedules = schedulesData ?? [];
  const [overrides, setOverrides] = useState<OnCallOverride[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { if (overridesData) setOverrides(overridesData); }, [overridesData]);


  const handleApprove = (id: string) => {
    setOverrides(prev =>
      prev.map(o =>
        o.id === id
          ? {
              ...o,
              status: 'approved',
              approvedById: 'u-001',
              approvedByName: 'Sarah Chen',
              approvedAt: new Date().toISOString(),
            }
          : o
      )
    );
  };

  const handleReject = (id: string) => {
    setOverrides(prev =>
      prev.map(o => (o.id === id ? { ...o, status: 'rejected' } : o))
    );
  };

  const handleNewOverride = (override: OnCallOverride) => {
    setOverrides(prev => [override, ...prev]);
  };

  // Sort: pending first, then by createdAt desc
  const sorted = [...overrides].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex flex-col gap-6 py-6 px-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-end">
        <Can module="platform" action="manage">
          <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
            <PlusCircle size={15} className="mr-1.5" />
            Request Override
          </Button>
        </Can>
      </div>

      {/* Override cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-ois-text-muted text-sm">
          No overrides found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map(override => (
            <OverrideCard
              key={override.id}
              override={override}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      <RequestOverrideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        schedules={schedules}
        onSubmit={handleNewOverride}
      />
    </div>
  );
};
