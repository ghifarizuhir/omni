import React from 'react';
import { DRTestIssue } from '@/src/types/continuity';

interface Props {
  issue: DRTestIssue;
}

const severityMeta = {
  critical:    { label: 'Critical',    color: '#B42318', bg: '#FEF3F2', border: '#F04438' },
  major:       { label: 'Major',       color: '#B45309', bg: '#FFFAEB', border: '#F79009' },
  minor:       { label: 'Minor',       color: '#B45309', bg: '#FEFCE8', border: '#EAB308' },
  observation: { label: 'Observation', color: '#475467', bg: '#F1F3F7', border: '#D0D5DD' },
} as const;

const issueStatusMeta = {
  open:        { label: 'Open',        color: '#B42318', bg: '#FEF3F2' },
  in_progress: { label: 'In Progress', color: '#0BA5EC', bg: '#F0F9FF' },
  resolved:    { label: 'Resolved',    color: '#067647', bg: '#ECFDF3' },
} as const;

export const DRTestIssueCard: React.FC<Props> = ({ issue }) => {
  const sevMeta = severityMeta[issue.severity];
  const statusM = issueStatusMeta[issue.status];

  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{ borderColor: sevMeta.border, backgroundColor: sevMeta.bg }}
    >
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold"
          style={{ color: sevMeta.color, backgroundColor: 'white', border: `1px solid ${sevMeta.border}` }}
        >
          {sevMeta.label}
        </span>
        <p className="text-sm font-semibold text-gray-900 flex-1">{issue.title}</p>
        <span
          className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ color: statusM.color, backgroundColor: statusM.bg }}
        >
          {statusM.label}
        </span>
      </div>

      <p className="text-sm text-gray-700">{issue.description}</p>

      {issue.resolution && (
        <div className="pt-1 border-t border-gray-200/60">
          <p className="text-xs text-gray-500 font-medium">Resolution:</p>
          <p className="text-sm text-gray-700">{issue.resolution}</p>
        </div>
      )}

      {issue.linkedChangePublicId && (
        <p className="text-xs text-gray-500">
          Linked change:{' '}
          <span className="font-mono text-blue-600 hover:underline cursor-pointer">
            {issue.linkedChangePublicId}
          </span>
        </p>
      )}
    </div>
  );
};
