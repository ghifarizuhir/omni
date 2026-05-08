import React from 'react';
import { Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RuleQueryDisplayProps {
  query: string;
  className?: string;
}

export const RuleQueryDisplay: React.FC<RuleQueryDisplayProps> = ({ query, className }) => {
  return (
    <div className={cn(
      "flex items-start gap-2 p-2 bg-ois-bg border border-ois-border rounded font-mono text-[11px] text-ois-text-muted leading-relaxed group",
      className
    )}>
      <Terminal size={12} className="mt-0.5 flex-shrink-0 text-ois-text-subtle group-hover:text-ois-primary transition-colors" />
      <span className="break-all">{query}</span>
    </div>
  );
};
