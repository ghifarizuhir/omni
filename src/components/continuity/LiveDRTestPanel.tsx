import React, { useState } from 'react';
import { X, Pause, AlertTriangle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { DRTestStatusPill } from './DRTestStatusPill';
import { DRTestTypeChip } from './DRTestTypeChip';
import { DRTestStepRow } from './DRTestStepRow';
import { DRTestIssueCard } from './DRTestIssueCard';
import { DRTestNotesLog } from './DRTestNotesLog';
import { DRTestRun } from '@/src/types/continuity';

interface Props {
  run: DRTestRun;
  onClose: () => void;
}

function getRunningMinutes(startedAt?: string): number {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
}

export const LiveDRTestPanel: React.FC<Props> = ({ run, onClose }) => {
  const [notes, setNotes] = useState<Array<{ name: string; time: string; text: string }>>([]);

  const progressPct =
    run.totalSteps > 0 ? Math.round((run.completedSteps / run.totalSteps) * 100) : 0;

  const activeStepId = run.stepResults.find((s) => s.status === 'in_progress')?.id;

  const handleAddNote = (text: string) => {
    setNotes((prev) => [
      ...prev,
      { name: run.triggeredByName, time: new Date().toISOString(), text },
    ]);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-gray-900">{run.publicId}</span>
          <DRTestStatusPill status={run.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="gap-1">
            <Pause className="w-3.5 h-3.5" />
            Pause
          </Button>
          <Button variant="destructive" size="sm">
            Fail test
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-5 space-y-6">
          {/* Plan + meta */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-gray-900">{run.planName}</span>
              <DRTestTypeChip type={run.type} />
              {run.startedAt && (
                <span className="text-sm text-gray-500">
                  · {getRunningMinutes(run.startedAt)} min running
                </span>
              )}
            </div>
            {run.participants.length > 0 && (
              <p className="text-xs text-gray-500">
                Participants: {run.participants.map((p) => p.userName).join(', ')}
              </p>
            )}
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{progressPct}% complete</span>
              <span>
                {run.completedSteps}/{run.totalSteps} steps
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Steps</p>
            <div className="space-y-1">
              {run.stepResults.map((step) => (
                <DRTestStepRow
                  key={step.id}
                  step={step}
                  isActive={step.id === activeStepId}
                  onMarkPassed={step.id === activeStepId ? () => {} : undefined}
                  onMarkFailed={step.id === activeStepId ? () => {} : undefined}
                  onAddNote={step.id === activeStepId ? () => {} : undefined}
                />
              ))}
            </div>
          </div>

          {/* Issues */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Issues Found
            </p>
            {run.issues.length === 0 ? (
              <p className="text-sm text-gray-400 italic">None so far.</p>
            ) : (
              <div className="space-y-2">
                {run.issues.map((issue) => (
                  <DRTestIssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            )}
          </div>

          {/* Notes log */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes Log
            </p>
            <DRTestNotesLog notes={notes} onAddNote={handleAddNote} />
          </div>
        </div>
      </div>
    </div>
  );
};
