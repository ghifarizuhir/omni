import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';

export interface Tab {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  children: React.ReactNode | React.ReactNode[];
  activeTabId?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  children, 
  activeTabId: controlledActiveId, 
  onChange,
  className 
}) => {
  const [internalActiveId, setInternalActiveId] = useState(tabs[0]?.id);
  const activeId = controlledActiveId || internalActiveId;

  const handleTabClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    setInternalActiveId(id);
    onChange?.(id);
  };

  const childrenArray = React.Children.toArray(children);
  const activeIndex = tabs.findIndex(t => t.id === activeId);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-b border-ois-border">
        <nav className="flex gap-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.disabled)}
              className={cn(
                "py-4 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-all",
                activeId === tab.id
                  ? "border-ois-primary text-ois-primary"
                  : "border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={tab.disabled}
            >
              <div className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
      </div>
      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
        {childrenArray[activeIndex]}
      </div>
    </div>
  );
};
