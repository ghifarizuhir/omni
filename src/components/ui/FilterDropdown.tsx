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
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Capture-phase mousedown so this fires before React's bubble-phase onClick,
  // preventing a same-click open→close race condition.
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

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1.5',
          'text-sm border border-ois-border rounded-lg bg-white',
          'text-ois-text hover:border-ois-border-strong transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary',
          open && 'border-ois-primary ring-2 ring-ois-primary/30'
        )}
      >
        <span className="whitespace-nowrap">{displayLabel}</span>
        <ChevronDown
          size={13}
          className={cn(
            'text-ois-text-subtle transition-transform duration-150 shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] w-max max-w-[260px] bg-white border border-ois-border rounded-lg py-1 shadow-ois-dropdown">
          {options.map(option => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-left',
                  'hover:bg-ois-surface-muted transition-colors',
                  isActive ? 'text-ois-primary' : 'text-ois-text'
                )}
              >
                <span className={cn('truncate', isActive ? 'font-medium' : 'font-normal')}>
                  {option.label}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {option.count !== undefined && (
                    <span className={cn(
                      'inline-flex items-center justify-center min-w-[20px] px-1.5 h-5 rounded-full text-[11px] font-medium',
                      isActive ? 'bg-ois-primary/10 text-ois-primary' : 'bg-ois-surface-muted text-ois-text-subtle'
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
      )}
    </div>
  );
};
