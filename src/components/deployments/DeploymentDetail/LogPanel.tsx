import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Download, Play, Pause, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LogEntry } from './LogEntry';
import { DeploymentLogEntry, LogLevel } from '../../../types/deployment';
import { logLevelMeta } from '../../../lib/constants';

interface LogPanelProps {
  logs: DeploymentLogEntry[];
  deploymentId: string;
}

const ALL_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set(ALL_LEVELS));
  const [source, setSource] = useState('all');
  const [stage, setStage] = useState('all');
  const [streaming, setStreaming] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sources = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => s.add(l.source));
    return Array.from(s).sort();
  }, [logs]);

  const stages = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => l.stageId && s.add(l.stageId));
    return Array.from(s).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((l) => {
      if (!levels.has(l.level)) return false;
      if (source !== 'all' && l.source !== source) return false;
      if (stage !== 'all' && l.stageId !== stage) return false;
      if (q) {
        const inMsg = l.message.toLowerCase().includes(q);
        const inFields = l.fields
          ? Object.entries(l.fields).some(
              ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q),
            )
          : false;
        if (!inMsg && !inFields) return false;
      }
      return true;
    });
  }, [logs, levels, source, stage, search]);

  useEffect(() => {
    if (streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered, streaming]);

  const toggleLevel = (level: LogLevel) => {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col border border-[#EAECF0] rounded-xl overflow-hidden bg-[#0D1117]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161B22] border-b border-[#30363D] flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8B949E]" />
          <input
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 rounded-md bg-[#21262D] border border-[#30363D] text-xs text-[#C9D1D9] placeholder:text-[#8B949E] outline-none focus:border-[#1F4FD4]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_LEVELS.map((level) => {
            const meta = logLevelMeta[level];
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={cn(
                  'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-opacity',
                  levels.has(level) ? 'opacity-100' : 'opacity-30',
                )}
                style={{ color: meta.color, background: `${meta.color}22` }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="appearance-none bg-[#21262D] border border-[#30363D] text-[#C9D1D9] text-xs rounded-md pl-2 pr-6 py-1.5 outline-none focus:border-[#1F4FD4] cursor-pointer"
            >
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B949E] pointer-events-none" />
          </div>

          {stages.length > 0 && (
            <div className="relative">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="appearance-none bg-[#21262D] border border-[#30363D] text-[#C9D1D9] text-xs rounded-md pl-2 pr-6 py-1.5 outline-none focus:border-[#1F4FD4] cursor-pointer"
              >
                <option value="all">All stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B949E] pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => setStreaming((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors',
              streaming
                ? 'bg-[#1F4FD4] border-[#1F4FD4] text-white'
                : 'bg-[#21262D] border-[#30363D] text-[#C9D1D9] hover:border-[#8B949E]',
            )}
          >
            {streaming ? <Pause size={11} /> : <Play size={11} />}
            {streaming ? 'Streaming' : 'Paused'}
          </button>

          <button
            className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-[#C9D1D9] px-2 py-1.5 rounded-md hover:bg-[#21262D] border border-transparent hover:border-[#30363D] transition-colors"
          >
            <Download size={11} />
            Export
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto bg-white"
        style={{ height: 500 }}
      >
        {filtered.length === 0 ? (
          <p className="text-xs text-[#98A2B3] py-8 text-center">No log entries match your filters.</p>
        ) : (
          filtered.map((entry) => <LogEntry key={entry.id} entry={entry} />)
        )}
      </div>

      <div className="px-3 py-2 bg-[#F9FAFB] border-t border-[#EAECF0] text-[11px] text-[#667085]">
        Showing {filtered.length} of {logs.length} entries
      </div>
    </div>
  );
};
