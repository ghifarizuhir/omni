import React from 'react';

export interface SummaryStatCell {
  label: string;
  value: string;
}

interface SummaryStatBlockProps {
  rows: SummaryStatCell[][];
}

export const SummaryStatBlock: React.FC<SummaryStatBlockProps> = ({ rows }) => {
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
