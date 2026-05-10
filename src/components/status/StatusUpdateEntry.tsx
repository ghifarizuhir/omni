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
  const timeStr = new Date(update.timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';

  return (
    <div className="relative pl-5">
      {/* Timeline line dot */}
      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-gray-300" />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">{update.authorName}</span>
          <span className="text-xs text-gray-400">{timeStr}</span>
        </div>
        <p className="mt-0.5 text-sm text-gray-700">{update.body}</p>
      </div>
    </div>
  );
};
