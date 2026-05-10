import React from 'react';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface AiSuggestionChipProps {
  text: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export const AiSuggestionChip: React.FC<AiSuggestionChipProps> = ({ text, onAccept, onDismiss }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-[10px] py-2',
        'border border-dashed'
      )}
      style={{
        borderColor: '#378ADD',
        background: 'rgba(230, 241, 251, 0.2)',
      }}
    >
      {/* Icon */}
      <Lightbulb size={13} style={{ color: '#185FA5', flexShrink: 0 }} />

      {/* Text */}
      <span className="flex-1 text-[11px] text-ois-text-muted leading-snug">{text}</span>

      {/* Accept button */}
      <button
        onClick={onAccept}
        className={cn(
          'flex-shrink-0 rounded px-2 py-[3px] text-[10px] font-medium transition-colors',
          'border hover:brightness-95 active:brightness-90'
        )}
        style={{
          background: '#E6F1FB',
          color: '#0C447C',
          borderColor: '#378ADD',
          borderWidth: '0.5px',
        }}
      >
        + Add
      </button>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 rounded p-0.5 text-ois-text-subtle hover:text-ois-text-muted hover:bg-white/10 transition-colors"
        aria-label="Dismiss suggestion"
      >
        <X size={12} />
      </button>
    </div>
  );
};
