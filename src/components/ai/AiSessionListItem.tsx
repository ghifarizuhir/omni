import React from 'react';
import { cn } from '@/src/lib/utils';
import type { AiSession } from '@/src/types/ai';

interface AiSessionListItemProps {
  session: AiSession;
  isActive: boolean;
  onClick: () => void;
}

function getDomainLabel(domain: AiSession['domain']): string {
  switch (domain) {
    case 'cmdb': return 'CMDB';
    case 'knowledge_base': return 'Knowledge Base';
    case 'incident': return 'Incident';
    case 'problem': return 'Problem';
    case 'change': return 'Change';
    case 'all': return 'Semua domain';
  }
}

function getRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (d >= todayStart) {
    return `Hari ini · ${timeStr}`;
  } else if (d >= yesterdayStart) {
    return `Kemarin · ${timeStr}`;
  } else {
    const diffDays = Math.floor((todayStart.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    return `${diffDays} hari lalu`;
  }
}

export const AiSessionListItem: React.FC<AiSessionListItemProps> = ({ session, isActive, onClick }) => {
  const relDate = getRelativeDate(session.updatedAt);
  const domainLabel = getDomainLabel(session.domain);

  if (isActive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left rounded-lg px-3 py-2.5 cursor-pointer',
          'border border-ois-border bg-ois-surface',
          'hover:bg-ois-surface-muted transition-colors duration-100',
          'flex flex-col gap-1.5'
        )}
      >
        {/* Title */}
        <span className="text-[12px] font-semibold text-ois-text truncate block w-full">
          {session.title}
        </span>

        {/* Subtitle row: domain chip + date */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none',
              'bg-ois-primary/10 text-ois-primary'
            )}
          >
            {domainLabel}
          </span>
          <span className="text-[10px] text-ois-text-subtle">{relDate}</span>
        </div>

        {/* Badges row */}
        {(session.draftsConfirmed > 0 || session.draftsPending > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {session.draftsConfirmed > 0 && (
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none',
                  'bg-ois-success-pale text-ois-success'
                )}
              >
                {session.draftsConfirmed} saved
              </span>
            )}
            {session.draftsPending > 0 && (
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none',
                  'bg-ois-warning-pale text-ois-warning'
                )}
              >
                {session.draftsPending} pending
              </span>
            )}
          </div>
        )}
      </button>
    );
  }

  // Inactive variant — simpler list item
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-1.5 cursor-pointer rounded-md',
        'hover:bg-ois-surface-muted transition-colors duration-100',
        'flex flex-col gap-0.5'
      )}
    >
      <span className="text-[12px] text-ois-text-muted truncate block w-full">
        {session.title}
      </span>
      <span className="text-[11px] text-ois-text-subtle">
        {relDate} · {domainLabel}
      </span>
    </button>
  );
};
