import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  risks: string[];
}

export const BIARiskList: React.FC<Props> = ({ risks }) => {
  if (!risks.length) {
    return <p className="text-sm text-gray-400 italic">No risks recorded.</p>;
  }

  return (
    <ul className="space-y-2">
      {risks.map((risk, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-sm text-gray-700">{risk}</span>
        </li>
      ))}
    </ul>
  );
};
