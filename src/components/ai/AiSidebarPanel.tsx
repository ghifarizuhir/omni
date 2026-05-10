import React from 'react';
import type { AiDomain, AiSession } from '@/src/types/ai';
import { AiDomainSelector } from './AiDomainSelector';
import { AiSessionListItem } from './AiSessionListItem';

interface AiSidebarPanelProps {
  sessions: AiSession[];
  activeSessionId: string;
  activeDomain: AiDomain;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
  onDomainChange: (domain: AiDomain) => void;
}

export const AiSidebarPanel: React.FC<AiSidebarPanelProps> = ({
  sessions,
  activeSessionId,
  activeDomain,
  onSessionSelect,
  onNewSession,
  onDomainChange,
}) => (
  <div className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden bg-ois-surface h-full">
    {/* Domain Selector */}
    <div className="p-3 border-b border-ois-border">
      <AiDomainSelector
        activeDomain={activeDomain}
        onDomainChange={onDomainChange}
      />
    </div>

    {/* Session list */}
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">
          Sesi
        </span>
        <button
          type="button"
          onClick={onNewSession}
          className="text-[11px] text-ois-primary hover:underline"
        >
          + Baru
        </button>
      </div>
      {sessions.map((session) => (
        <AiSessionListItem
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onClick={() => onSessionSelect(session.id)}
        />
      ))}
    </div>
  </div>
);
