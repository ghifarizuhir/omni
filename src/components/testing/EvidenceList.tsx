import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface EvidenceListProps {
  items: Array<{ label: string; passed: boolean }>;
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ items }) => {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2 text-xs">
          {item.passed ? (
            <CheckCircle2 size={13} className="text-[#12B76A] shrink-0" />
          ) : (
            <XCircle size={13} className="text-[#F04438] shrink-0" />
          )}
          <span className={item.passed ? 'text-[#067647]' : 'text-[#B42318]'}>{item.label}</span>
        </li>
      ))}
    </ul>
  );
};
