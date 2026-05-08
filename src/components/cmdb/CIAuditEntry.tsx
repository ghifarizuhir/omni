import React from 'react';
import { CIAuditEntry } from '../../types/ci';
import { auditActionMeta } from '../../lib/constants';
import { formatRelative } from '../../lib/format';
import { Plus, Pencil, Trash2, Link, Unlink, RefreshCw, Search, LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link as RouterLink } from 'react-router-dom';

const ICON_MAP: Record<string, LucideIcon> = {
  Plus,
  Pencil,
  Trash2,
  Link,
  Unlink,
  RefreshCw,
  Search,
};

interface CIAuditEntryCardProps {
  entry: CIAuditEntry;
  showCIInfo?: boolean;
}

export const CIAuditEntryCard: React.FC<CIAuditEntryCardProps> = ({ entry, showCIInfo = true }) => {
  const meta = auditActionMeta[entry.action];
  const Icon = ICON_MAP[meta?.icon || 'RefreshCw'];

  return (
    <div className="flex gap-4 relative">
      {/* Icon Circle */}
      <div className={cn(
        "z-10 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shrink-0",
        "bg-ois-surface shadow-sm"
      )}>
        <Icon size={14} style={{ color: meta?.color || '#475467' }} />
      </div>

      <div className="flex-1 min-w-0 bg-white p-3 rounded-lg border border-ois-border shadow-sm hover:border-ois-border-strong transition-colors">
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-ois-text">{entry.actorName}</span>
            <span className="text-ois-text-subtle font-medium">{meta?.label}</span>
            {showCIInfo && (
              <RouterLink to={`/cmdb/${entry.ciId}`} className="font-mono font-bold text-ois-primary hover:underline">
                [{entry.ciPublicId}]
              </RouterLink>
            )}
          </div>
          <span className="text-[10px] font-bold text-ois-text-subtle whitespace-nowrap">
            {formatRelative(entry.timestamp)}
          </span>
        </div>

        {entry.action === 'updated' && entry.field && (
          <div className="mt-2 text-xs bg-ois-surface-muted rounded-md p-2 border border-ois-border">
            <span className="text-[10px] uppercase font-bold text-ois-text-subtle block mb-1">Field: {entry.field}</span>
            <div className="flex items-center gap-2">
              <span className="text-ois-text-muted opacity-60 italic">{String(entry.before)}</span>
              <ArrowRight size={10} className="text-ois-text-subtle" />
              <span className="font-bold text-ois-text">{String(entry.after)}</span>
            </div>
          </div>
        )}

        {entry.description && (
          <p className="mt-1 text-xs text-ois-text-muted leading-relaxed">
            {entry.description}
          </p>
        )}

        <div className="mt-2 text-[10px] font-bold text-ois-text-subtle flex items-center gap-2 uppercase tracking-tight">
          <span>Source: {entry.source}</span>
          <span>•</span>
          <span>Actor: {entry.actorType}</span>
        </div>
      </div>
    </div>
  );
};
