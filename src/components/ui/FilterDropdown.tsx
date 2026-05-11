import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface FilterDropdownOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: FilterDropdownOption[];
  placeholder?: string;
  className?: string;
  /** Makes trigger and panel fill the width of their container — for use inside forms */
  fullWidth?: boolean;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
  fullWidth = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Capture-phase mousedown prevents the same-click open→close race condition
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  const selected = options.find(o => o.value === value);
  const displayLabel = selected ? selected.label : placeholder;
  const hasValue = selected !== undefined;

  return (
    <div ref={containerRef} className={cn('relative', fullWidth && 'w-full', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'inline-flex items-center gap-2 h-8 pl-3 pr-2 text-sm font-medium rounded-lg border transition-all',
          fullWidth && 'w-full justify-between',
          open
            ? 'bg-white border-ois-primary ring-2 ring-ois-primary/20 text-ois-text'
            : [
                'bg-ois-surface-muted border-ois-border',
                hasValue ? 'text-ois-text' : 'text-ois-text-muted',
                'hover:bg-white hover:border-ois-border-strong',
              ],
          'focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary',
        )}
      >
        <span className={cn('truncate', fullWidth ? 'flex-1 text-left' : 'whitespace-nowrap')}>
          {displayLabel}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            'shrink-0 transition-transform duration-150',
            open ? 'rotate-180 text-ois-primary' : 'text-ois-text-subtle',
          )}
        />
      </button>

      {/* Panel */}
      {open && (
        <div className={cn(
          'absolute top-full mt-1.5 z-50 overflow-hidden',
          'bg-white border border-ois-border rounded-xl',
          'shadow-ois-dropdown',
          fullWidth ? 'left-0 right-0' : 'left-0 min-w-[160px] w-max max-w-[260px]',
        )}>
          {/* Primary accent strip */}
          <div className="h-[3px] bg-ois-primary" />

          <div className="py-1.5">
            {options.map(option => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition-colors',
                    isActive
                      ? 'bg-ois-primary/[0.05] text-ois-primary'
                      : 'text-ois-text hover:bg-ois-surface-muted',
                  )}
                >
                  <span className={cn('truncate', isActive ? 'font-semibold' : 'font-normal')}>
                    {option.label}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {option.count !== undefined && (
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-[20px] px-1.5 h-5 rounded-full text-[11px] font-medium',
                        isActive
                          ? 'bg-ois-primary/10 text-ois-primary'
                          : 'bg-ois-surface-muted text-ois-text-subtle',
                      )}>
                        {option.count}
                      </span>
                    )}
                    {isActive
                      ? <Check size={13} className="text-ois-primary" />
                      : <span className="w-[13px]" />
                    }
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
