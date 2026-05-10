import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Deployment } from '../../../types/deployment';

interface RollbackModalProps {
  deployment: Deployment;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const RollbackModal: React.FC<RollbackModalProps> = ({
  deployment,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [notifyStakeholders, setNotifyStakeholders] = useState(true);
  const [autoCreateIncident, setAutoCreateIncident] = useState(false);

  const isReasonValid = reason.trim().length >= 30;

  const handleConfirm = () => {
    if (isReasonValid) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Rollback" size="md">
      <div className="py-4 flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl bg-[#FEF3F2] border border-[#F04438]/20 px-4 py-3">
          <AlertTriangle size={16} className="text-[#F04438] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#B42318]">
              This will roll back {deployment.componentName}
            </p>
            <p className="text-xs text-[#B42318] mt-0.5">
              The deployment <span className="font-mono font-bold">{deployment.publicId}</span> will
              be reverted to the previous successful deployment.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-[#667085] font-semibold mb-1">Previous target</p>
          <div className="rounded-lg bg-[#F9FAFB] border border-[#EAECF0] px-4 py-3 text-xs text-[#344054]">
            Previous successful deployment in{' '}
            <span className="font-semibold uppercase">{deployment.environment}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1">
            Reason for rollback <span className="text-[#F04438]">*</span>
            <span className="text-[#98A2B3] font-normal ml-1">(min 30 chars)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Describe why this rollback is needed…"
            className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#101828] placeholder:text-[#98A2B3] outline-none focus:border-[#1F4FD4] focus:ring-2 focus:ring-[#1F4FD4]/10 resize-none"
          />
          <div className="flex justify-end mt-0.5">
            <span
              className={`text-[11px] ${reason.trim().length >= 30 ? 'text-[#067647]' : 'text-[#98A2B3]'}`}
            >
              {reason.trim().length}/30
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyStakeholders}
              onChange={(e) => setNotifyStakeholders(e.target.checked)}
              className="w-4 h-4 rounded border-[#D0D5DD] accent-[#1F4FD4]"
            />
            <span className="text-sm text-[#344054]">Notify stakeholders</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCreateIncident}
              onChange={(e) => setAutoCreateIncident(e.target.checked)}
              className="w-4 h-4 rounded border-[#D0D5DD] accent-[#1F4FD4]"
            />
            <span className="text-sm text-[#344054]">Auto-create incident</span>
          </label>
        </div>

        <p className="text-xs text-[#667085] bg-[#FFFAEB] border border-[#F79009]/20 rounded-lg px-3 py-2">
          Rollbacks cannot be undone automatically. A new deployment will be required to re-apply the
          rolled-back changes.
        </p>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={!isReasonValid}
          >
            Confirm rollback
          </Button>
        </div>
      </div>
    </Modal>
  );
};
