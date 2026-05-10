import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ImprovementInitiative } from '../../../types/improvement';
import { improvementStatusMeta, formatBenefitUSD } from '../../../lib/constants';
import { cn } from '../../../lib/utils';

interface BubbleNodeProps {
  initiative: ImprovementInitiative;
  size: number;
  onHover: (id: string | null) => void;
  isHovered: boolean;
}

export function BubbleNode({ initiative, size, onHover, isHovered }: BubbleNodeProps) {
  const navigate = useNavigate();
  const meta = improvementStatusMeta[initiative.status];

  return (
    <div className="relative inline-block">
      <div
        className="rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 flex-shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: meta.dot,
          opacity: 0.85,
        }}
        onMouseEnter={() => onHover(initiative.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => navigate(`/improvement/${initiative.publicId}`)}
      >
        <span className="text-white font-mono text-center leading-none" style={{ fontSize: Math.max(8, size / 5) }}>
          {initiative.publicId.split('-').slice(-1)[0]}
        </span>
      </div>

      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-gray-900 text-white text-xs p-3 shadow-xl pointer-events-none">
          <p className="font-mono text-gray-400 mb-0.5">{initiative.publicId}</p>
          <p className="font-semibold mb-1 line-clamp-2">{initiative.title}</p>
          <p className="text-gray-300 mb-1">{meta.label}</p>
          <p className="text-green-400">{formatBenefitUSD(initiative.estimatedBenefit.annualValueUSD)}/yr</p>
          <p className="text-gray-400">{initiative.ownerName}</p>
          {initiative.estimatedROIPercent > 0 && (
            <p className="text-blue-300">{initiative.estimatedROIPercent}% ROI</p>
          )}
        </div>
      )}
    </div>
  );
}
