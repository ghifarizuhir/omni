import React from 'react';
import { cn } from '@/src/lib/utils';
import { AiAvatar } from './AiAvatar';
import { formatAiTime } from './utils';

interface AiMessageBubbleProps {
  text?: string;
  timestamp: string; // ISO string
  children?: React.ReactNode;
}

export const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({ text, timestamp, children }) => {
  return (
    <div className="flex items-start gap-2 w-full">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <AiAvatar />
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {text && (
          <p className={cn('text-[13px] text-ois-text-muted leading-relaxed m-0')}>
            {text}
          </p>
        )}
        {children && <div className="flex flex-col gap-2">{children}</div>}

        {/* Timestamp */}
        <span className="text-[10px] text-ois-text-subtle self-end mt-0.5 select-none">
          {formatAiTime(timestamp)}
        </span>
      </div>
    </div>
  );
};
