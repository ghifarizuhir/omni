import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { usersService, useResource } from '@/src/services';
import { Incident } from '@/src/types/incident';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident;
  onConfirm: (commanderId: string) => void;
}

export const PromoteMajorModal: React.FC<Props> = ({ isOpen, onClose, incident, onConfirm }) => {
  const [commanderId, setCommanderId] = useState('');
  const [error, setError] = useState('');
  const { data: users } = useResource(() => usersService.list(), []);
  const commanderOptions = (users ?? []).map(u => ({ value: u.id, label: u.name }));

  const handleConfirm = () => {
    if (!commanderId) {
      setError('Please select an Incident Commander.');
      return;
    }
    onConfirm(commanderId);
    setCommanderId('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setCommanderId('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Promote to Major Incident" size="sm">
      <div className="py-4 space-y-4">
        {/* Amber warning block */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            This incident will be promoted to Major. A War Room will be available.
          </p>
        </div>

        {/* Incident reference */}
        <div className="text-xs text-ois-text-subtle">
          Incident: <span className="font-mono text-ois-primary">{incident.publicId}</span>
        </div>

        {/* Commander selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ois-text">
            Incident Commander <span className="text-red-500">*</span>
          </label>
          <FilterDropdown
            value={commanderId}
            onChange={val => { setCommanderId(val); setError(''); }}
            options={commanderOptions}
            placeholder="Select commander…"
            fullWidth
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-ois-border mt-4">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>
            Promote to Major
          </Button>
        </div>
      </div>
    </Modal>
  );
};
