import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Phone, PlusCircle, Users } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ShiftCalendarGrid } from '@/src/components/oncall/ShiftCalendarGrid';
import { RequestOverrideModal } from '@/src/components/oncall/RequestOverrideModal';
import { mockOnCallSchedules, mockOnCallOverrides } from '@/src/mocks';
import { OnCallOverride } from '@/src/types/platform';
import { cn } from '@/src/lib/utils';

export const OnCallSchedule: React.FC = () => {
  const [selectedScheduleId, setSelectedScheduleId] = useState(mockOnCallSchedules[0]?.id ?? '');
  const [overrides, setOverrides] = useState<OnCallOverride[]>(mockOnCallOverrides);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedSchedule = mockOnCallSchedules.find(s => s.id === selectedScheduleId) ?? mockOnCallSchedules[0];

  const handleNewOverride = (override: OnCallOverride) => {
    setOverrides(prev => [override, ...prev]);
  };

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
          <div className="flex items-center gap-2.5">
            <Phone size={18} className="text-ois-primary" />
            <h1 className="text-2xl font-bold text-ois-text tracking-tight">Schedule View</h1>
          </div>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
          <PlusCircle size={15} className="mr-1.5" />
          Request Override
        </Button>
      </div>

      {/* Schedule selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">Schedule:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {mockOnCallSchedules.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedScheduleId(s.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                selectedScheduleId === s.id
                  ? 'bg-ois-primary text-white border-ois-primary'
                  : 'bg-ois-surface text-ois-text border-ois-border hover:bg-ois-surface-muted'
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {selectedSchedule && (
        <>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-ois-text">{selectedSchedule.name}</h2>
                <p className="text-xs text-ois-text-muted">{selectedSchedule.teamName}</p>
              </div>
              <div className="text-xs text-ois-text-muted">
                {selectedSchedule.rotationIntervalDays}-day rotation
              </div>
            </div>
            <ShiftCalendarGrid schedule={selectedSchedule} overrides={overrides} />
          </Card>

          {/* Rotation members */}
          <Card>
            <div className="px-5 py-4 border-b border-ois-border">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-ois-text-muted" />
                <h2 className="text-sm font-bold text-ois-text">Rotation Members</h2>
              </div>
            </div>
            <ul className="divide-y divide-ois-border">
              {selectedSchedule.members.map((member, idx) => (
                <li key={member.userId} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ois-primary/10 text-ois-primary flex items-center justify-center text-xs font-bold">
                      {member.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ois-text">{member.userName}</p>
                      <p className="text-xs text-ois-text-muted">Shift order {idx + 1}</p>
                    </div>
                  </div>
                  {member.userId === selectedSchedule.currentPrimaryId && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ois-success bg-ois-success-pale border border-ois-success/20 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-ois-success inline-block" />
                      On call now
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
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
