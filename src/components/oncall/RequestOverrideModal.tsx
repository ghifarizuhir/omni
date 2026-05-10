import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { OnCallSchedule, OnCallOverride } from '@/src/types/platform';

interface RequestOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: OnCallSchedule[];
  onSubmit: (override: OnCallOverride) => void;
}

export const RequestOverrideModal: React.FC<RequestOverrideModalProps> = ({
  isOpen,
  onClose,
  schedules,
  onSubmit,
}) => {
  const [scheduleId, setScheduleId] = useState(schedules[0]?.id ?? '');
  const [originalUserId, setOriginalUserId] = useState('');
  const [coveredById, setCoveredById] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const selectedSchedule = schedules.find(s => s.id === scheduleId);
  const members = selectedSchedule?.members ?? [];

  const handleScheduleChange = (id: string) => {
    setScheduleId(id);
    setOriginalUserId('');
    setCoveredById('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleId || !originalUserId || !coveredById || !fromDate || !toDate) return;

    const originalMember = members.find(m => m.userId === originalUserId);
    const coveredMember = members.find(m => m.userId === coveredById);
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!originalMember || !coveredMember || !schedule) return;

    const now = new Date().toISOString();
    const newOverride: OnCallOverride = {
      id: `ovr-${Date.now()}`,
      publicId: `OVR-2026-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      scheduleId,
      scheduleName: schedule.name,
      originalUserId,
      originalUserName: originalMember.userName,
      overrideUserId: coveredById,
      overrideUserName: coveredMember.userName,
      startAt: new Date(fromDate).toISOString(),
      endAt: new Date(toDate).toISOString(),
      reason: reason.trim() || undefined,
      requestedById: 'u-001',
      requestedByName: 'Sarah Chen',
      status: 'pending',
      createdAt: now,
    };

    onSubmit(newOverride);

    // Reset form
    setOriginalUserId('');
    setCoveredById('');
    setFromDate('');
    setToDate('');
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Override" size="md">
      <form onSubmit={handleSubmit} className="py-4 flex flex-col gap-5">
        {/* Schedule */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
            Schedule
          </label>
          <select
            className="w-full h-9 px-3 text-sm border border-ois-border rounded-lg bg-ois-surface text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
            value={scheduleId}
            onChange={e => handleScheduleChange(e.target.value)}
            required
          >
            {schedules.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Original person */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
            Original Person (being covered)
          </label>
          <select
            className="w-full h-9 px-3 text-sm border border-ois-border rounded-lg bg-ois-surface text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
            value={originalUserId}
            onChange={e => setOriginalUserId(e.target.value)}
            required
          >
            <option value="">Select person…</option>
            {members.map(m => (
              <option key={m.userId} value={m.userId}>{m.userName}</option>
            ))}
          </select>
        </div>

        {/* Covered by */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
            Covered By
          </label>
          <select
            className="w-full h-9 px-3 text-sm border border-ois-border rounded-lg bg-ois-surface text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
            value={coveredById}
            onChange={e => setCoveredById(e.target.value)}
            required
          >
            <option value="">Select person…</option>
            {members
              .filter(m => m.userId !== originalUserId)
              .map(m => (
                <option key={m.userId} value={m.userId}>{m.userName}</option>
              ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
              From
            </label>
            <input
              type="datetime-local"
              className="w-full h-9 px-3 text-sm border border-ois-border rounded-lg bg-ois-surface text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
              To
            </label>
            <input
              type="datetime-local"
              className="w-full h-9 px-3 text-sm border border-ois-border rounded-lg bg-ois-surface text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
            Reason <span className="normal-case font-normal text-ois-text-muted">(optional)</span>
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm border border-ois-border rounded-lg bg-ois-surface text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary resize-none"
            placeholder="e.g. Conference attendance, family commitment…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md">
            Request Override
          </Button>
        </div>
      </form>
    </Modal>
  );
};
