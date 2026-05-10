import React, { useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { ReportFrequency } from '@/src/types/measurement';

export interface ScheduleData {
  frequency: ReportFrequency;
  startDate: string;
}

interface Step2ScheduleProps {
  onBack: () => void;
  onNext: (data: ScheduleData) => void;
}

const FREQUENCIES: { value: ReportFrequency; label: string; description: string }[] = [
  { value: 'on_demand',  label: 'On Demand',  description: 'Generate manually whenever needed' },
  { value: 'daily',      label: 'Daily',      description: 'Every day at 6:00 AM UTC' },
  { value: 'weekly',     label: 'Weekly',     description: 'Every Monday at 6:00 AM UTC' },
  { value: 'monthly',    label: 'Monthly',    description: 'First day of each month at 6:00 AM UTC' },
  { value: 'quarterly',  label: 'Quarterly',  description: 'First day of each quarter at 6:00 AM UTC' },
];

export const Step2Schedule: React.FC<Step2ScheduleProps> = ({ onBack, onNext }) => {
  const [frequency, setFrequency] = useState<ReportFrequency>('monthly');
  const [startDate, setStartDate] = useState('2026-06-01');

  const handleNext = () => {
    onNext({ frequency, startDate });
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Frequency */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Frequency</label>
        <div className="flex flex-col gap-2">
          {FREQUENCIES.map((f) => (
            <label
              key={f.value}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                frequency === f.value
                  ? 'border-ois-primary bg-ois-primary-pale'
                  : 'border-ois-border hover:bg-ois-surface-muted'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={f.value}
                checked={frequency === f.value}
                onChange={() => setFrequency(f.value)}
                className="accent-ois-primary"
              />
              <div>
                <p className="text-sm font-medium text-ois-text">{f.label}</p>
                <p className="text-xs text-ois-text-subtle">{f.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Start date */}
      {frequency !== 'on_demand' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-lg border border-ois-border px-3 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30 w-48"
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between pt-2 border-t border-ois-border">
        <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
        <Button variant="primary" size="sm" onClick={handleNext}>
          Next: Delivery →
        </Button>
      </div>
    </div>
  );
};
