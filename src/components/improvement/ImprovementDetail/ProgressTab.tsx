import React, { useState } from 'react';
import { ImprovementInitiative } from '../../../types/improvement';
import { ImprovementProgressBar } from '../ImprovementProgressBar';
import { Button } from '../../ui/Button';

interface ProgressTabProps {
  initiative: ImprovementInitiative;
  onLogUpdate: (body: string, progress: number) => void;
}

export function ProgressTab({ initiative, onLogUpdate }: ProgressTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [body, setBody] = useState('');
  const [newProgress, setNewProgress] = useState(initiative.progressPercent);

  const sorted = [...initiative.updates]
    .filter((u) => u.type === 'progress_update' || u.type === 'comment' || u.type === 'status_change')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestProgressUpdate = sorted.find((u) => u.type === 'progress_update');

  function handleSubmit() {
    if (!body.trim()) return;
    onLogUpdate(body.trim(), newProgress);
    setBody('');
    setShowForm(false);
  }

  return (
    <div className="space-y-4 py-4">
      {/* Main progress */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-800">Overall progress</p>
          <span className="text-xl font-bold text-gray-900">{initiative.progressPercent}%</span>
        </div>
        <ImprovementProgressBar percent={initiative.progressPercent} size="md" />
        {latestProgressUpdate && (
          <p className="text-xs text-gray-500 mt-2">
            Last updated by <span className="font-medium text-gray-700">{latestProgressUpdate.authorName}</span> on{' '}
            {new Date(latestProgressUpdate.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Progress history */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Progress history</p>
        <div className="space-y-2">
          {sorted.map((u) => (
            <div key={u.id} className="flex gap-3 text-sm">
              <div className="flex flex-col items-center">
                <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-400" />
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-gray-700">{u.authorName}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(u.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {u.type === 'progress_update' && u.progressBefore != null && u.progressAfter != null && (
                    <span className="text-xs text-blue-600 font-medium">
                      {u.progressBefore}% → {u.progressAfter}%
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{u.body}</p>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-gray-400 italic">No updates yet.</p>
          )}
        </div>
      </div>

      {/* Log form */}
      {showForm ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600">Log progress update</p>
          <textarea
            className="w-full rounded border border-gray-200 p-2 text-sm bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            rows={3}
            placeholder="Describe what was accomplished..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div>
            <label className="text-xs text-gray-600 block mb-1">Progress: {newProgress}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={newProgress}
              onChange={(e) => setNewProgress(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit}>Submit</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          Log progress update
        </Button>
      )}
    </div>
  );
}
