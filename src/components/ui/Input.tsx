import React from 'react';
import { cn } from '@/src/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-xs font-medium text-ois-text-muted">{label}</label>}
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3 text-ois-text-subtle">{icon}</div>}
          <input
            ref={ref}
            className={cn(
              'h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-9',
              error && 'border-ois-danger focus:ring-ois-danger/20 focus:border-ois-danger',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-ois-danger mt-0.5">{error}</p>}
      </div>
    );
  }
);
