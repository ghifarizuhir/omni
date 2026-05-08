import React from 'react';
import { cn } from '../../lib/utils';

interface RuleStatusToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const RuleStatusToggle: React.FC<RuleStatusToggleProps> = ({ 
  enabled, 
  onToggle, 
  className,
  size = 'sm'
}) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!enabled);
      }}
      className={cn(
        "relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ois-primary focus:ring-offset-2",
        enabled ? "bg-ois-success" : "bg-ois-border-strong",
        size === 'sm' ? "h-4 w-8" : "h-6 w-11",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          enabled 
            ? (size === 'sm' ? "translate-x-4" : "translate-x-5") 
            : "translate-x-0",
          size === 'sm' ? "h-3 w-3" : "h-5 w-5"
        )}
      />
    </button>
  );
};
