import React from 'react';
import { Inbox, CheckCheck } from 'lucide-react';

interface InboxEmptyStateProps {
  variant: 'no_selection' | 'all_caught_up';
}

export const InboxEmptyState: React.FC<InboxEmptyStateProps> = ({ variant }) => {
  if (variant === 'all_caught_up') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-ois-success-pale flex items-center justify-center mb-3">
          <CheckCheck size={22} className="text-ois-success" />
        </div>
        <p className="text-sm font-semibold text-ois-text">All caught up</p>
        <p className="text-xs text-ois-text-subtle mt-1">No items match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-ois-surface-muted flex items-center justify-center mb-4">
        <Inbox size={26} className="text-ois-text-subtle" />
      </div>
      <p className="text-sm font-semibold text-ois-text">Select an item</p>
      <p className="text-xs text-ois-text-subtle mt-1 max-w-48">
        Choose an inbox item from the list to view its details.
      </p>
    </div>
  );
};
