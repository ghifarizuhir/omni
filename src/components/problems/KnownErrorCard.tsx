import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Edit3, BookOpen, ExternalLink } from 'lucide-react';
import { Problem } from '@/src/types/problem';
import { formatDate, formatRelative } from '@/src/lib/format';
import { usersService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';

interface KnownErrorCardProps {
  problem: Problem;
  onEdit?: () => void;
}

const EFFECTIVENESS_META = {
  full:    { label: 'FULL',    color: '#067647', bg: '#ECFDF3', border: '#ABEFC6', icon: CheckCircle2 },
  partial: { label: 'PARTIAL', color: '#DC6803', bg: '#FFFAEB', border: '#FEDF89', icon: AlertTriangle },
  none:    { label: 'NONE',    color: '#B42318', bg: '#FEF3F2', border: '#FECDCA', icon: XCircle },
};

export const KnownErrorCard: React.FC<KnownErrorCardProps> = ({ problem, onEdit }) => {
  const ke = problem.knownError;
  if (!ke) return null;

  const { data: users } = useResource(() => usersService.list(), []);
  const publisher = (users ?? []).find(u => u.id === ke.publishedBy);
  const eff = EFFECTIVENESS_META[ke.workaroundEffectiveness];
  const EffIcon = eff.icon;

  return (
    <div
      className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: eff.border, backgroundColor: eff.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: eff.border }}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} style={{ color: eff.color }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: eff.color }}>
            Known Error
          </span>
          <span className="text-xs text-ois-text-muted">
            · Published {formatRelative(ke.publishedAt)}
            {publisher && ` by ${publisher.name}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border"
            style={{ color: eff.color, backgroundColor: 'white', borderColor: eff.border }}
          >
            <EffIcon size={11} />
            {eff.label} workaround
          </span>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-xs text-ois-primary hover:underline"
            >
              <Edit3 size={11} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Root cause */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-1">Root cause</p>
          <p className="text-sm text-ois-text font-medium leading-relaxed">{ke.rootCause}</p>
        </div>

        <div className="border-t border-ois-border/50" />

        {/* Workaround */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-1">Workaround</p>
          <p className="text-sm text-ois-text leading-relaxed">{ke.workaround}</p>
        </div>

        {/* KB / Change links */}
        <div className="flex flex-wrap gap-3">
          {problem.linkedKBArticleIds.map(kbId => (
            <a
              key={kbId}
              href={`/kb/${kbId}`}
              className="inline-flex items-center gap-1.5 text-xs text-ois-primary hover:underline"
            >
              <BookOpen size={12} />
              {kbId}
            </a>
          ))}
          {problem.linkedChangeIds.map(chgId => (
            <a
              key={chgId}
              href={`/changes/${chgId}`}
              className="inline-flex items-center gap-1.5 text-xs text-ois-primary hover:underline"
            >
              <ExternalLink size={12} />
              {chgId}
            </a>
          ))}
        </div>

        <div className="border-t border-ois-border/50" />

        {/* Versions + fix plan */}
        <div className="grid grid-cols-2 gap-4">
          {ke.affectedVersions && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-1">Affected versions</p>
              <p className="text-xs font-mono text-ois-text">{ke.affectedVersions}</p>
            </div>
          )}
          {ke.permanentFixPlan && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-1">Permanent fix plan</p>
              <p className="text-xs text-ois-text">{ke.permanentFixPlan}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
