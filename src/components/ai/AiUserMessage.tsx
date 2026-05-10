import React from 'react';
import { cn } from '@/src/lib/utils';
import { formatAiTime } from './utils';

interface AiUserMessageProps {
  text: string;
  timestamp: string; // ISO string
}

export const AiUserMessage: React.FC<AiUserMessageProps> = ({ text, timestamp }) => {
  return (
    <div className="flex justify-end w-full">
      <div
        className={cn(
          'flex flex-col gap-1 rounded-lg px-3 py-2',
          'bg-ois-surface-muted',
          'max-w-[80%]'
        )}
        style={{ border: '0.5px solid var(--color-ois-border)' }}
      >
        <p className="text-[13px] text-ois-text leading-relaxed m-0 whitespace-pre-wrap break-words">
          {text}
        </p>
        <span className="text-[10px] text-ois-text-subtle self-end select-none">
          {formatAiTime(timestamp)}
        </span>
      </div>
    </div>
  );
};
