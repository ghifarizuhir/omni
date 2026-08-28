import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { ShieldAlert } from 'lucide-react';
import { Problem } from '@/src/types/problem';

interface Props {
  problem: Problem;
  isOpen: boolean;
  onClose: () => void;
  onPromote: (data: {
    rootCause: string;
    workaround: string;
    effectiveness: 'full' | 'partial' | 'none';
    affectedVersions?: string;
    permanentFixPlan?: string;
  }) => void | Promise<void>;
}

const inputClass =
  'w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text bg-white placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary transition-colors resize-none';

export const PromoteToKnownErrorModal: React.FC<Props> = ({ problem, isOpen, onClose, onPromote }) => {
  const [rootCause, setRootCause] = useState('');
  const [workaround, setWorkaround] = useState('');
  const [effectiveness, setEffectiveness] = useState<'full' | 'partial' | 'none'>('partial');
  const [affectedVersions, setAffectedVersions] = useState('');
  const [permanentFixPlan, setPermanentFixPlan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!rootCause.trim()) e.rootCause = 'Root cause is required.';
    if (!workaround.trim()) e.workaround = 'Workaround is required.';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    await onPromote({
      rootCause: rootCause.trim(),
      workaround: workaround.trim(),
      effectiveness,
      affectedVersions: affectedVersions.trim() || undefined,
      permanentFixPlan: permanentFixPlan.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Promote to Known Error — ${problem.publicId}`} size="md">
      <div className="py-4 space-y-5">
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <ShieldAlert size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            Publishing as a Known Error makes root cause and workaround visible to all L1/L2 agents in the KEDB.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ois-text">Root cause <span className="text-ois-danger">*</span></label>
          <textarea rows={2} value={rootCause} onChange={e => { setRootCause(e.target.value); setErrors(p => ({ ...p, rootCause: '' })); }}
            placeholder="Definitive root cause statement..." className={inputClass} />
          {errors.rootCause && <p className="text-xs text-ois-danger">{errors.rootCause}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ois-text">Workaround <span className="text-ois-danger">*</span></label>
          <textarea rows={3} value={workaround} onChange={e => { setWorkaround(e.target.value); setErrors(p => ({ ...p, workaround: '' })); }}
            placeholder="Steps ops can take RIGHT NOW to mitigate..." className={inputClass} />
          {errors.workaround && <p className="text-xs text-ois-danger">{errors.workaround}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ois-text">Workaround effectiveness</label>
          <div className="flex gap-4">
            {(['full', 'partial', 'none'] as const).map(e => (
              <label key={e} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="effectiveness" value={e} checked={effectiveness === e}
                  onChange={() => setEffectiveness(e)} className="text-ois-primary" />
                <span className="text-sm capitalize text-ois-text">{e}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ois-text">Affected versions <span className="text-ois-text-subtle font-normal">(optional)</span></label>
            <input type="text" value={affectedVersions} onChange={e => setAffectedVersions(e.target.value)}
              placeholder="e.g. payment-api < 2.4.1" className={inputClass.replace('resize-none', '')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ois-text">Permanent fix plan <span className="text-ois-text-subtle font-normal">(optional)</span></label>
            <input type="text" value={permanentFixPlan} onChange={e => setPermanentFixPlan(e.target.value)}
              placeholder="e.g. Migrate to pgbouncer..." className={inputClass.replace('resize-none', '')} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>
            <ShieldAlert size={14} className="mr-1.5" />
            Publish as Known Error
          </Button>
        </div>
      </div>
    </Modal>
  );
};
