import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Phone, PlusCircle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { OverrideCard } from '@/src/components/oncall/OverrideCard';
import { RequestOverrideModal } from '@/src/components/oncall/RequestOverrideModal';
import { mockOnCallSchedules, mockOnCallOverrides } from '@/src/mocks';
import { OnCallOverride } from '@/src/types/platform';
import { Can } from '@/src/lib/rbac';

export const OnCallOverrides: React.FC = () => {
  const [overrides, setOverrides] = useState<OnCallOverride[]>(mockOnCallOverrides);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const pendingCount = overrides.filter(o => o.status === 'pending').length;
  const approvedCount = overrides.filter(o => o.status === 'approved').length;

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
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            to="/on-call"
            className="inline-flex items-center gap-1.5 text-xs text-ois-text-muted hover:text-ois-primary transition-colors mb-2"
          >
            <ChevronLeft size={13} />
            On-Call
          </Link>
          <div className="flex items-center gap-2.5 mb-1">
            <Phone size={18} className="text-ois-primary" />
            <h1 className="text-2xl font-bold text-ois-text tracking-tight">Overrides</h1>
          </div>
          <p className="text-sm text-ois-text-muted">
            {overrides.length} total
            {' · '}
            {pendingCount > 0 ? (
              <span className="text-ois-warning font-medium">{pendingCount} pending approval</span>
            ) : (
              <span>0 pending</span>
            )}
            {' · '}
            {approvedCount} approved
          </p>
        </div>

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
        schedules={mockOnCallSchedules}
        onSubmit={handleNewOverride}
      />
    </div>
  );
};
