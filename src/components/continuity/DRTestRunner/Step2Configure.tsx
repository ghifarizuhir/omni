import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { drTestTypeMeta } from '@/src/lib/constants';
import { DRTestType } from '@/src/types/continuity';

export interface TestConfig {
  type: DRTestType;
  environment: string;
  date: string;
  objectives: string[];
  scope: string;
  participants: Array<{ role: string; name: string }>;
}

interface Props {
  onBack: () => void;
  onNext: (config: TestConfig) => void;
}

const TEST_TYPES: DRTestType[] = ['tabletop', 'functional', 'full_failover', 'chaos'];
const ENVIRONMENTS = ['DR Staging', 'Production'];
const DEFAULT_PARTICIPANTS = [
  { role: 'Incident Commander', name: '' },
  { role: 'Technical Lead', name: '' },
  { role: 'Communications Lead', name: '' },
];

export const Step2Configure: React.FC<Props> = ({ onBack, onNext }) => {
  const [type, setType] = useState<DRTestType>('tabletop');
  const [environment, setEnvironment] = useState('DR Staging');
  const [date, setDate] = useState('');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [scope, setScope] = useState('');
  const [participants, setParticipants] = useState(DEFAULT_PARTICIPANTS);

  const addObjective = () => setObjectives((prev) => [...prev, '']);
  const removeObjective = (idx: number) =>
    setObjectives((prev) => prev.filter((_, i) => i !== idx));
  const updateObjective = (idx: number, val: string) =>
    setObjectives((prev) => prev.map((o, i) => (i === idx ? val : o)));

  const updateParticipant = (idx: number, field: 'role' | 'name', val: string) =>
    setParticipants((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p))
    );

  const handleNext = () => {
    onNext({
      type,
      environment,
      date,
      objectives: objectives.filter(Boolean),
      scope,
      participants: participants.filter((p) => p.name.trim()),
    });
  };

  const valid = date.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Test type */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Test Type</p>
        <div className="space-y-2">
          {TEST_TYPES.map((t) => {
            const meta = drTestTypeMeta[t];
            return (
              <label
                key={t}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  type === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="mt-1 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                  <p className="text-xs text-gray-500">{meta.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Environment */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Environment</p>
        <div className="flex gap-3">
          {ENVIRONMENTS.map((env) => (
            <label
              key={env}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer transition-colors ${
                environment === env ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="environment"
                value={env}
                checked={environment === env}
                onChange={() => setEnvironment(env)}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-800">{env}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date/time */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scheduled Date & Time</p>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {/* Objectives */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Objectives</p>
        <div className="space-y-2">
          {objectives.map((obj, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={obj}
                onChange={(e) => updateObjective(idx, e.target.value)}
                placeholder={`Objective ${idx + 1}`}
                className="flex-1 h-8 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              {objectives.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeObjective(idx)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addObjective} className="gap-1 text-blue-600">
            <Plus className="w-3.5 h-3.5" />
            Add objective
          </Button>
        </div>
      </div>

      {/* Scope */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scope</p>
        <textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Describe the scope of this test..."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
        />
      </div>

      {/* Participants */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Participants</p>
        <div className="space-y-2">
          {participants.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={p.role}
                onChange={(e) => updateParticipant(idx, 'role', e.target.value)}
                placeholder="Role"
                className="w-40 h-8 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              <input
                type="text"
                value={p.name}
                onChange={(e) => updateParticipant(idx, 'name', e.target.value)}
                placeholder="Name"
                className="flex-1 h-8 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="sm" onClick={handleNext} disabled={!valid}>
          Review
        </Button>
      </div>
    </div>
  );
};
