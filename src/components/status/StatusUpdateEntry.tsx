import React from 'react';

interface StatusUpdateEntryProps {
  update: {
    id: string;
    timestamp: string;
    body: string;
    authorName: string;
  };
}

export const StatusUpdateEntry: React.FC<StatusUpdateEntryProps> = ({ update }) => {
  const timeStr =
    new Date(update.timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';

  return (
    <div className="relative pl-5">
      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-ois-border-strong" />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ois-text">{update.authorName}</span>
          <span className="text-xs text-ois-text-subtle">{timeStr}</span>
        </div>
        <p className="mt-0.5 text-sm text-ois-text-muted leading-relaxed">{update.body}</p>
      </div>
    </div>
  );
};
