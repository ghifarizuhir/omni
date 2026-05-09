import React, { useState } from 'react';
import { CheckCircle2, BookOpen, Calendar } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Incident } from '@/src/types/incident';

interface Props {
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (data: ResolveData) => void;
}

export interface ResolveData {
  summary: string;
  rootCause?: string;
  workaround?: string;
  suggestKB: boolean;
  schedulePIR: boolean;
}

export const ResolveIncidentModal: React.FC<Props> = ({ incident, isOpen, onClose, onResolve }) => {
  const [summary, setSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [workaround, setWorkaround] = useState('');
  const [suggestKB, setSuggestKB] = useState(false);
  const [schedulePIR, setSchedulePIR] = useState(incident.priority === 'P1');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!summary.trim()) {
      setError('Resolution summary is required.');
      return;
    }
    onResolve({ summary: summary.trim(), rootCause: rootCause.trim() || undefined, workaround: workaround.trim() || undefined, suggestKB, schedulePIR });
    onClose();
  };

  const inputClass = 'w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text bg-white placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary transition-colors resize-none';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Resolve ${incident.publicId}`} size="md">
      <div className="py-4 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ois-text">
            Resolution summary <span className="text-ois-danger">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="What was done to restore service?"
            value={summary}
            onChange={e => { setSummary(e.target.value); setError(''); }}
            className={inputClass}
          />
          {error && <p className="text-xs text-ois-danger">{error}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ois-text">
            Root cause <span className="text-ois-text-subtle font-normal">(optional, lightweight)</span>
          </label>
          <textarea
            rows={2}
            placeholder="What caused this incident?"
            value={rootCause}
            onChange={e => setRootCause(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-ois-text-subtle">
            Tip: For deeper RCA,{' '}
            <button className="text-ois-primary hover:underline">link a problem record</button>.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ois-text">
            Workaround applied <span className="text-ois-text-subtle font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Any temporary workaround that was applied?"
            value={workaround}
            onChange={e => setWorkaround(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={suggestKB}
              onChange={e => setSuggestKB(e.target.checked)}
              className="w-4 h-4 rounded border-ois-border text-ois-primary focus:ring-ois-primary/30"
            />
            <div className="flex items-center gap-1.5 text-sm text-ois-text group-hover:text-ois-text-strong">
              <BookOpen size={14} className="text-ois-text-subtle" />
              Mark for KB suggestion <span className="text-ois-text-subtle text-xs">(will create draft for reviewer)</span>
            </div>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={schedulePIR}
              onChange={e => setSchedulePIR(e.target.checked)}
              className="w-4 h-4 rounded border-ois-border text-ois-primary focus:ring-ois-primary/30"
            />
            <div className="flex items-center gap-1.5 text-sm text-ois-text group-hover:text-ois-text-strong">
              <Calendar size={14} className="text-ois-text-subtle" />
              Schedule a Post-Implementation Review (PIR)
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>
            <CheckCircle2 size={15} className="mr-1.5" />
            Resolve incident
          </Button>
        </div>
      </div>
    </Modal>
  );
};
