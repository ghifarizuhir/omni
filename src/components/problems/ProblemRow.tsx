import React from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, BookOpen, Wrench, Activity } from 'lucide-react';
import { Problem } from '@/src/types/problem';
import { usersService, useResource } from '@/src/services';
import { Avatar } from '@/src/components/ui/Avatar';
import { SeverityBadge } from '@/src/components/ui/StatusSeverityBadges';
import { ProblemStatusPill } from './ProblemStatusPill';
import { ProblemSourceChip } from './ProblemSourceChip';
import { formatRelative } from '@/src/lib/format';

interface ProblemRowProps {
  problem: Problem;
  onClick?: () => void;
}

export const ProblemRow: React.FC<ProblemRowProps> = ({ problem, onClick }) => {
  const { data: users } = useResource(() => usersService.list(), []);
  const owner = (users ?? []).find(u => u.id === problem.ownerId);

  return (
    <tr
      className="group hover:bg-ois-surface-muted/30 transition-colors cursor-pointer"
      onClick={onClick}
      title={problem.description.slice(0, 200)}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <Link
          to={`/problems/${problem.publicId}`}
          onClick={e => e.stopPropagation()}
          className="font-mono text-xs font-semibold text-ois-primary hover:underline"
        >
          {problem.publicId}
        </Link>
      </td>
      <td className="px-4 py-3 max-w-[240px]">
        <p className="font-medium text-ois-text truncate">{problem.title}</p>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {problem.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] font-mono text-ois-text-subtle bg-ois-surface-muted px-1.5 py-0.5 rounded">#{t}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <ProblemStatusPill status={problem.status} />
      </td>
      <td className="px-4 py-3">
        <SeverityBadge severity={problem.severity} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <ProblemSourceChip source={problem.source} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {owner ? (
          <div className="flex items-center gap-2">
            <Avatar name={owner.name} size="xs" />
            <span className="text-xs text-ois-text truncate max-w-[90px]">{owner.name}</span>
          </div>
        ) : <span className="text-xs text-ois-text-subtle">—</span>}
      </td>
      <td className="px-4 py-3">
        {problem.relatedIncidentCount > 0 ? (
          <span className="font-mono font-bold text-sm" style={{ color: problem.relatedIncidentCount >= 4 ? '#B42318' : '#DC6803' }}>
            {problem.relatedIncidentCount}
          </span>
        ) : <span className="text-xs text-ois-text-subtle">—</span>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {problem.lastIncidentDate
          ? <span className="text-xs text-ois-text-muted">{formatRelative(problem.lastIncidentDate)}</span>
          : <span className="text-xs text-ois-text-subtle">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {problem.rca && <Activity size={13} className="text-ois-primary" title="RCA present" />}
          {problem.linkedKBArticleIds.length > 0 && <BookOpen size={13} className="text-ois-text-muted" title="KB article" />}
          {problem.linkedChangeIds.length > 0 && <Wrench size={13} className="text-ois-text-muted" title="Change linked" />}
          {!problem.rca && !problem.linkedKBArticleIds.length && !problem.linkedChangeIds.length &&
            <span className="text-xs text-ois-text-subtle">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded flex items-center justify-center hover:bg-ois-border text-ois-text-muted">
          <MoreVertical size={15} />
        </button>
      </td>
    </tr>
  );
};
