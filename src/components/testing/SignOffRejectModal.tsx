import React, { useState } from 'react';
import { X, XCircle, AlertTriangle } from 'lucide-react';
import { SignOff } from '../../types/testing';
import { Button } from '../ui/Button';

interface SignOffRejectModalProps {
  signOff: SignOff;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const SignOffRejectModal: React.FC<SignOffRejectModalProps> = ({
  signOff,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 30;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-ois-surface rounded-ois-card shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ois-text">
            Reject sign-off {signOff.publicId}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-ois-surface-muted text-ois-text-muted">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-start gap-2 bg-[#FFFAEB] border border-[#F79009]/30 rounded-lg px-3 py-2.5 mb-5">
          <AlertTriangle size={14} className="text-[#DC6803] mt-0.5 shrink-0" />
          <p className="text-xs text-[#DC6803]">
            Rejection will block deployment of <strong>{signOff.subjectTitle}</strong>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-ois-text mb-1">
            Reason <span className="text-ois-text-subtle font-normal">(required, min 30 characters)</span>
          </label>
          <textarea
            className="w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text bg-ois-surface-muted resize-none focus:outline-none focus:ring-2 focus:ring-[#F04438]/30"
            rows={4}
            placeholder="Describe why this sign-off is being rejected…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-[11px] text-ois-text-subtle mt-1 text-right">
            {reason.trim().length} / 30 min
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="md"
            className="gap-1"
            disabled={!isValid}
            onClick={() => onConfirm(reason.trim())}
          >
            <XCircle size={14} />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
};
