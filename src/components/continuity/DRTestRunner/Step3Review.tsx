import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { DRTestTypeChip } from '../DRTestTypeChip';
import { DRPlan } from '@/src/types/continuity';
import { TestConfig } from './Step2Configure';

interface Props {
  plan: DRPlan;
  config: TestConfig;
  onBack: () => void;
  onSchedule: () => void;
  onStartNow: () => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-2 py-1.5">
    <span className="text-sm text-gray-500 w-28 shrink-0">{label}</span>
    <div className="text-sm text-gray-900 flex-1">{children}</div>
  </div>
);

export const Step3Review: React.FC<Props> = ({ plan, config, onBack, onSchedule, onStartNow }) => {
  const isProductionFailover =
    config.type === 'full_failover' && config.environment.toLowerCase().includes('production');

  return (
    <div className="space-y-5">
      {isProductionFailover && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Production Full Failover Warning</p>
            <p className="text-sm text-red-700 mt-0.5">
              You are scheduling a full failover test against a Production environment. This will cause
              real service disruption. Ensure all stakeholders have been notified and change approval
              is in place before proceeding.
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selected Plan</p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{plan.publicId} · {plan.version}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
          <Row label="Type">
            <DRTestTypeChip type={config.type} />
          </Row>
          <Row label="Environment">{config.environment}</Row>
          <Row label="Scheduled">{config.date ? new Date(config.date).toLocaleString() : '—'}</Row>
          <Row label="Scope">{config.scope || '—'}</Row>
        </div>
      </div>

      {config.objectives.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Objectives</p>
          <ul className="space-y-1">
            {config.objectives.map((obj, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400">•</span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {config.participants.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Participants</p>
          <div className="space-y-1">
            {config.participants.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-36">{p.role}</span>
                <span className="text-gray-900 font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSchedule}
          disabled={isProductionFailover}
        >
          Schedule
        </Button>
        <Button
          variant={isProductionFailover ? 'destructive' : 'primary'}
          size="sm"
          onClick={onStartNow}
        >
          {isProductionFailover ? 'Start now (risky)' : 'Start now'}
        </Button>
      </div>
    </div>
  );
};
