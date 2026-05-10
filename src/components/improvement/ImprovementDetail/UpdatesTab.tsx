import React, { useState } from 'react';
import { ImprovementInitiative, ImprovementStatus, ImprovementUpdate } from '../../../types/improvement';
import { improvementStatusMeta } from '../../../lib/constants';
import { ImprovementStatusPill } from '../ImprovementStatusPill';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';

interface UpdatesTabProps {
  initiative: ImprovementInitiative;
  onAddUpdate: (body: string, status?: ImprovementStatus) => void;
}

const UPDATE_DOT_COLORS: Record<ImprovementUpdate['type'], string> = {
  status_change: '#9E77ED',
  progress_update: '#0BA5EC',
  comment: '#98A2B3',
  metric_update: '#12B76A',
  linkage_added: '#F79009',
};

const ALL_STATUSES: ImprovementStatus[] = [
  'identified', 'evaluating', 'approved', 'in_progress', 'validating', 'completed', 'on_hold', 'cancelled',
];

export function UpdatesTab({ initiative, onAddUpdate }: UpdatesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [body, setBody] = useState('');
  const [newStatus, setNewStatus] = useState<ImprovementStatus | ''>('');

  const sorted = [...initiative.updates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  function handleSubmit() {
    if (!body.trim()) return;
    onAddUpdate(body.trim(), newStatus || undefined);
    setBody('');
    setNewStatus('');
    setShowForm(false);
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-4">
        {sorted.map((u) => (
          <div key={u.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 border-2 border-white ring-1 ring-gray-200"
                style={{ backgroundColor: UPDATE_DOT_COLORS[u.type] }}
              />
            </div>
            <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">{u.authorName}</span>
                <span className="text-xs text-gray-400">
                  {new Date(u.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {u.type === 'status_change' && u.fromStatus && u.toStatus && (
                  <span className="flex items-center gap-1">
                    <ImprovementStatusPill status={u.fromStatus} />
                    <span className="text-gray-400 text-xs">→</span>
                    <ImprovementStatusPill status={u.toStatus} />
                  </span>
                )}
                {u.type === 'progress_update' && u.progressBefore != null && u.progressAfter != null && (
                  <span className="text-xs text-blue-600 font-medium">
                    Progress: {u.progressBefore}% → {u.progressAfter}%
                  </span>
                )}
              </div>
              {u.body && <p className="text-sm text-gray-600">{u.body}</p>}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-gray-400 italic">No updates yet.</p>
        )}
      </div>

      {showForm ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600">Add update</p>
          <textarea
            className="w-full rounded border border-gray-200 p-2 text-sm bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            rows={3}
            placeholder="What's the latest update?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div>
            <label className="text-xs text-gray-500 block mb-1">Change status (optional)</label>
            <select
              className="rounded border border-gray-200 text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ImprovementStatus | '')}
            >
              <option value="">— keep current —</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{improvementStatusMeta[s].label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit}>Submit</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          Add update
        </Button>
      )}
    </div>
  );
}
