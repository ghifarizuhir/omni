import React from 'react';
import type { AiQueryResultTextPayload } from '@/src/types/ai';
import { formatAiTime } from './utils';

interface AiQueryResultTextProps {
  payload: AiQueryResultTextPayload;
}

export const AiQueryResultText: React.FC<AiQueryResultTextProps> = ({ payload }) => {
  return (
    <div
      className="rounded-md px-3 py-2.5 flex flex-col gap-1.5"
      style={{
        border: '0.5px solid var(--color-ois-border-tertiary, rgba(255,255,255,0.07))',
        background: 'var(--color-ois-surface-muted, rgba(255,255,255,0.03))',
      }}
    >
      {/* Query label */}
      <span className="text-[11px] text-ois-text-subtle leading-snug">{payload.query}</span>

      {/* Answer */}
      <p className="text-[15px] font-semibold text-ois-text-primary leading-snug m-0">
        {payload.answer}
      </p>

      {/* Timestamp */}
      <div className="flex justify-end">
        <span className="text-[10px] text-ois-text-subtle">{formatAiTime(payload.timestamp)}</span>
      </div>
    </div>
  );
};
