import React from 'react';

interface SummaryStatBlockProps {
  timeRange: string;
}

const rows = [
  [
    { label: 'incidents resolved',  value: '25' },
    { label: 'avg MTTR',            value: '2h 14m' },
    { label: 'total downtime',      value: '12h 47m' },
  ],
  [
    { label: 'changes implemented', value: '15' },
    { label: 'success rate',        value: '87%' },
    { label: 'failed · 1 rolled back', value: '2' },
  ],
  [
    { label: 'service requests',    value: '25' },
    { label: 'fulfilled',           value: '78%' },
    { label: 'SLA breaches active', value: '2' },
  ],
  [
    { label: 'test runs',           value: '124' },
    { label: 'pass rate',           value: '91%' },
    { label: 'content gaps in KB',  value: '4' },
  ],
];

export const SummaryStatBlock: React.FC<SummaryStatBlockProps> = () => {
  return (
    <div className="flex flex-col divide-y divide-ois-border">
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-4 py-3">
          {row.map((cell, ci) => (
            <div key={ci} className="flex flex-col gap-0.5">
              <span className="text-xl font-bold text-ois-text">{cell.value}</span>
              <span className="text-xs text-ois-text-subtle">{cell.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
