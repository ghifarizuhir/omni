import React from 'react';
import { Change, ChangeStatus } from '../../../types/change';
import { BoardColumn } from './BoardColumn';

const COLUMNS: { status: ChangeStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'submitted', label: 'Submitted' },
  { status: 'in_review', label: 'In Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'implementing', label: 'Implementing' },
];

interface ChangeBoardProps {
  changes: Change[];
}

export const ChangeBoard: React.FC<ChangeBoardProps> = ({ changes }) => {
  const byStatus = (status: ChangeStatus) =>
    changes.filter((c) => c.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
      {COLUMNS.map(({ status, label }) => (
        <BoardColumn
          key={status}
          label={`${label} (${byStatus(status).length})`}
          changes={byStatus(status)}
          highlightId="CHG-2026-00091"
        />
      ))}
    </div>
  );
};
