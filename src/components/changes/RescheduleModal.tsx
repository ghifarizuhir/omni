import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStart: string;
  currentEnd: string;
  // M6.11 (B2.1) — signature extended with `reason`. Parent owns submitting /
  // error state for symmetry with the inline Cancel modal in ChangeDetail.
  onReschedule: (newStart: string, newEnd: string, reason: string) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  currentStart,
  currentEnd,
  onReschedule,
  submitting = false,
  error = null,
}) => {
  const toDatetimeLocal = (iso: string) => iso.slice(0, 16);

  const [newStart, setNewStart] = useState(toDatetimeLocal(currentStart));
  const [newEnd, setNewEnd]     = useState(toDatetimeLocal(currentEnd));
  const [reason, setReason]     = useState('');
  const [localError, setLocalError] = useState('');

  const handleConfirm = async () => {
    if (!newStart || !newEnd) { setLocalError('Both dates are required.'); return; }
    if (new Date(newEnd) <= new Date(newStart)) {
      setLocalError('End must be after start.');
      return;
    }
    if (reason.trim().length < 10) {
      setLocalError('Reason must be at least 10 characters.');
      return;
    }
    setLocalError('');
    await onReschedule(
      new Date(newStart).toISOString(),
      new Date(newEnd).toISOString(),
      reason.trim(),
    );
  };

  const displayError = localError || error;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Change" size="sm">
      <div className="py-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ois-text-muted">New planned start</label>
          <input
            type="datetime-local"
            value={newStart}
            onChange={e => { setNewStart(e.target.value); setLocalError(''); }}
            disabled={submitting}
            className="w-full h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary disabled:opacity-60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ois-text-muted">New planned end</label>
          <input
            type="datetime-local"
            value={newEnd}
            onChange={e => { setNewEnd(e.target.value); setLocalError(''); }}
            disabled={submitting}
            className="w-full h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary disabled:opacity-60"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ois-text-muted">
            Reason <span className="text-ois-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setLocalError(''); }}
            rows={3}
            disabled={submitting}
            placeholder="Why is this change being rescheduled? (min 10 characters)"
            className="w-full rounded-md border border-ois-border-strong px-2.5 py-1.5 text-xs text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary disabled:opacity-60"
          />
        </div>
        {displayError && <p className="text-xs text-ois-danger">{displayError}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={submitting || reason.trim().length < 10}
          >
            {submitting ? 'Rescheduling…' : 'Reschedule'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
