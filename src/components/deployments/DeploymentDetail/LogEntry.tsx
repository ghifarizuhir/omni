import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { logLevelMeta } from '../../../lib/constants';
import { DeploymentLogEntry } from '../../../types/deployment';
import { formatDate } from '../../../lib/format';

interface LogEntryProps {
  entry: DeploymentLogEntry;
}

export const LogEntry: React.FC<LogEntryProps> = ({ entry }) => {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const meta = logLevelMeta[entry.level];
  const hasFields = entry.fields && Object.keys(entry.fields).length > 0;
  const hasTrace = Boolean(entry.stackTrace);

  return (
    <div className="group border-b border-[#F2F4F7] hover:bg-[#F9FAFB] px-3 py-1.5 text-xs">
      <div className="flex items-start gap-2 min-w-0">
        <span className="font-mono text-[#1F4FD4] shrink-0 mt-0.5 text-[10px]">
          {formatDate(entry.timestamp, 'HH:mm:ss.SSS')}
        </span>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 font-mono font-bold text-[10px] uppercase mt-0.5"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
        <span className="shrink-0 rounded px-1.5 py-0.5 bg-[#F1F3F7] text-[#667085] text-[10px] font-mono mt-0.5">
          {entry.source}
        </span>
        <span className={cn('flex-1 min-w-0 text-[#344054] break-all', entry.level === 'error' || entry.level === 'fatal' ? 'text-[#B42318] font-medium' : '')}>
          {entry.message}
        </span>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
          {hasFields && (
            <button
              onClick={() => setFieldsOpen((v) => !v)}
              className="text-[10px] text-[#1F4FD4] hover:underline flex items-center gap-0.5"
            >
              fields {fieldsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
          {hasTrace && (
            <button
              onClick={() => setTraceOpen((v) => !v)}
              className="text-[10px] text-[#DC6803] hover:underline flex items-center gap-0.5"
            >
              trace {traceOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
        </div>
      </div>

      {fieldsOpen && hasFields && (
        <div className="mt-1 ml-[calc(theme(space.8)+theme(space.16)+theme(space.24))] font-mono text-[10px] text-[#475467] bg-[#F2F4F7] rounded px-2 py-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
          {Object.entries(entry.fields!).map(([k, v]) => (
            <span key={k}>
              <span className="text-[#1F4FD4]">{k}</span>=
              <span className="text-[#344054]">{String(v)}</span>
            </span>
          ))}
        </div>
      )}

      {traceOpen && hasTrace && (
        <pre className="mt-1 ml-2 font-mono text-[10px] text-[#B42318] bg-[#FEF3F2] rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
          {entry.stackTrace}
        </pre>
      )}
    </div>
  );
};
