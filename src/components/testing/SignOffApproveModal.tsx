import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { SignOff } from '../../types/testing';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface SignOffApproveModalProps {
  signOff: SignOff;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string, scheduleCheck: boolean) => void;
}

export const SignOffApproveModal: React.FC<SignOffApproveModalProps> = ({
  signOff,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [note, setNote] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [scheduleCheck, setScheduleCheck] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-ois-surface rounded-ois-card shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ois-text">
            Approve sign-off {signOff.publicId}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-ois-surface-muted text-ois-text-muted">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-ois-text-muted mb-5">
          <span className="font-mono text-[#1F4FD4]">{signOff.subjectPublicId}</span> — {signOff.subjectTitle}
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-ois-text mb-1">
            Decision note <span className="text-ois-text-subtle font-normal">(optional)</span>
          </label>
          <textarea
            className="w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text bg-ois-surface-muted resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/40"
            rows={3}
            placeholder="Add a note about your decision…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            <span className="text-sm text-ois-text">
              I confirm I have reviewed all test evidence
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded"
              checked={scheduleCheck}
              onChange={(e) => setScheduleCheck(e.target.checked)}
            />
            <span className="text-sm text-ois-text">
              Schedule follow-up health check in 24h
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            className="gap-1"
            disabled={!reviewed}
            onClick={() => onConfirm(note, scheduleCheck)}
          >
            <CheckCircle2 size={14} />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
};
