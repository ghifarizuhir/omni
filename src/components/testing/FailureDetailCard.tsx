import React from 'react';
import { XCircle, AlertTriangle, RotateCcw, Flag, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { FlakyTestBadge } from './FlakyTestBadge';

interface FailureDetailCardProps {
  failure: {
    casePublicId: string;
    title: string;
    failureMessage: string;
    isFlaky: boolean;
  };
  duration?: number;
}

export const FailureDetailCard: React.FC<FailureDetailCardProps> = ({ failure, duration }) => {
  return (
    <div className="border-l-4 border-[#F04438] rounded-r-lg bg-[#FEF3F2] px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <span className="font-mono text-[10px] text-[#B42318] font-bold">{failure.casePublicId}</span>
          <p className="text-sm font-semibold text-[#101828] mt-0.5 truncate">{failure.title}</p>
        </div>
        {failure.isFlaky && <FlakyTestBadge flakeRate={0.2} />}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center gap-1 text-xs font-semibold text-[#F04438]">
          <XCircle size={12} />
          Failed
        </span>
        {duration !== undefined && (
          <span className="text-xs text-[#475467]">{duration}s</span>
        )}
      </div>

      <pre className="font-mono text-[11px] text-[#B42318] bg-[#FEF3F2] border border-[#F04438]/20 rounded p-2.5 overflow-x-auto whitespace-pre-wrap break-all mb-3">
        {failure.failureMessage}
      </pre>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <RotateCcw size={11} />
          Re-run case
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Flag size={11} />
          {failure.isFlaky ? 'Mark as stable' : 'Mark as flaky'}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <ExternalLink size={11} />
          Open case →
        </Button>
      </div>
    </div>
  );
};
