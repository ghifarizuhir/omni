import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStart: string;
  currentEnd: string;
  onReschedule: (newStart: string, newEnd: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  currentStart,
  currentEnd,
  onReschedule,
}) => {
  const toDatetimeLocal = (iso: string) => iso.slice(0, 16);

  const [newStart, setNewStart] = useState(toDatetimeLocal(currentStart));
  const [newEnd, setNewEnd]     = useState(toDatetimeLocal(currentEnd));
  const [error, setError]       = useState('');

  const handleConfirm = () => {
    if (!newStart || !newEnd) { setError('Both dates are required.'); return; }
    if (new Date(newEnd) <= new Date(newStart)) {
      setError('End must be after start.');
      return;
    }
    onReschedule(new Date(newStart).toISOString(), new Date(newEnd).toISOString());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Change" size="sm">
      <div className="py-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ois-text-muted">New planned start</label>
          <input
            type="datetime-local"
            value={newStart}
            onChange={e => { setNewStart(e.target.value); setError(''); }}
            className="w-full h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ois-text-muted">New planned end</label>
          <input
            type="datetime-local"
            value={newEnd}
            onChange={e => { setNewEnd(e.target.value); setError(''); }}
            className="w-full h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        {error && <p className="text-xs text-ois-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Reschedule</Button>
        </div>
      </div>
    </Modal>
  );
};
