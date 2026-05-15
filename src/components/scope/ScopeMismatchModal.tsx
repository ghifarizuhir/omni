import React from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';

interface ScopeMismatchModalProps {
  open: boolean;
  currentScopeName: string;
  submittedAppName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export const ScopeMismatchModal: React.FC<ScopeMismatchModalProps> = ({
  open,
  currentScopeName,
  submittedAppName,
  onCancel,
  onConfirm,
}) => {
  const [busy, setBusy] = React.useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onCancel} title="Scope mismatch" size="sm">
      <div className="py-4 space-y-4">
        <p className="text-sm text-ois-text leading-relaxed">
          You&apos;re submitting this to{' '}
          <strong className="font-semibold">{submittedAppName}</strong>, but your current scope is{' '}
          <strong className="font-semibold">{currentScopeName}</strong>. Continue?
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={busy}
            className="bg-ois-danger hover:bg-ois-danger/90 text-white border-ois-danger"
          >
            {busy ? 'Submitting…' : 'Continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
