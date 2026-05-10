import React, { useRef, useState, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface AiInputBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const AiInputBar: React.FC<AiInputBarProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Tanya atau instruksikan...',
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasText = value.trim().length > 0;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-expand up to ~3 lines (~72px)
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 72) + 'px';
    }
  };

  return (
    <div className="w-full border-t border-ois-border bg-ois-surface px-3 py-2.5">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-[13px] text-ois-text placeholder:text-ois-text-subtle',
            'focus:outline-none leading-relaxed py-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'overflow-hidden'
          )}
          style={{ minHeight: 24, maxHeight: 72 }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasText || disabled}
          className={cn(
            'flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-150',
            'w-8 h-8 mb-0.5',
            hasText && !disabled
              ? 'bg-ois-primary text-white hover:bg-ois-primary-hover active:scale-95 shadow-sm'
              : 'bg-ois-surface-muted text-ois-text-subtle cursor-not-allowed'
          )}
          aria-label="Kirim pesan"
        >
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
