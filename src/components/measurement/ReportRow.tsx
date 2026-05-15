import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Target, AlertTriangle, Wrench, Activity, BarChart2, FileText,
  MoreVertical, Play, History, FileSpreadsheet, FilePieChart, Code,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Report, ReportFormat } from '@/src/types/measurement';
import { reportTypeMeta } from '@/src/lib/constants';
import { ReportFrequencyPill } from './ReportFrequencyPill';

interface ReportRowProps {
  report: Report;
  onGenerate: () => void;
  onViewVersions: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Calendar:      <Calendar size={13} />,
  Target:        <Target size={13} />,
  AlertTriangle: <AlertTriangle size={13} />,
  Wrench:        <Wrench size={13} />,
  Activity:      <Activity size={13} />,
  BarChart2:     <BarChart2 size={13} />,
  FileText:      <FileText size={13} />,
};

const formatIcons: Record<ReportFormat, React.ReactNode> = {
  pdf:   <FileText size={12} />,
  excel: <FileSpreadsheet size={12} />,
  csv:   <FilePieChart size={12} />,
  json:  <Code size={12} />,
};

const formatLabels: Record<ReportFormat, string> = {
  pdf:   'PDF',
  excel: 'Excel',
  csv:   'CSV',
  json:  'JSON',
};

function relativeTime(isoStr?: string): string {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function futureTime(isoStr?: string): string {
  if (!isoStr) return 'On demand';
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days < 7) return `${days}d`;
  const wks = Math.floor(days / 7);
  return `${wks}w`;
}

export const ReportRow: React.FC<ReportRowProps> = ({ report, onGenerate, onViewVersions }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Reports created without an explicit `type` (e.g. minimal POST) fall back to
  // the generic "Custom" meta so the row still renders.
  const typeMeta = reportTypeMeta[report.type] ?? reportTypeMeta.custom;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <tr className="border-b border-ois-border hover:bg-ois-surface-muted/50 transition-colors">
      {/* publicId */}
      <td className="py-3 pr-3 pl-4">
        <span className="font-mono text-xs text-ois-text-subtle">{report.publicId}</span>
      </td>

      {/* Name */}
      <td className="py-3 pr-3 max-w-[240px]">
        <p className="text-sm font-medium text-ois-text leading-tight line-clamp-2">{report.name}</p>
      </td>

      {/* Type */}
      <td className="py-3 pr-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-ois-surface-muted border border-ois-border px-2 py-0.5 text-[11px] font-medium text-ois-text-muted">
          {iconMap[typeMeta.icon]}
          {typeMeta.label}
        </span>
      </td>

      {/* Frequency */}
      <td className="py-3 pr-3">
        <ReportFrequencyPill frequency={report.frequency} />
      </td>

      {/* Last generated */}
      <td className="py-3 pr-3">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            report.lastRunStatus === 'success' ? 'bg-[#12B76A]' : report.lastRunStatus === 'failed' ? 'bg-[#F04438]' : 'bg-gray-300',
          )} />
          <span className="text-xs text-ois-text-subtle">{relativeTime(report.lastGeneratedAt)}</span>
        </div>
      </td>

      {/* Next run */}
      <td className="py-3 pr-3">
        <span className="text-xs text-ois-text-subtle">{futureTime(report.nextRunAt)}</span>
      </td>

      {/* Formats */}
      <td className="py-3 pr-3">
        <div className="flex flex-wrap gap-1">
          {(report.format ?? []).map((fmt) => (
            <span key={fmt} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-ois-surface-muted border border-ois-border text-ois-text-muted">
              {formatIcons[fmt]}
              {formatLabels[fmt]}
            </span>
          ))}
        </div>
      </td>

      {/* Actions */}
      <td className="py-3 pr-4">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-ois-surface-muted text-ois-text-subtle"
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-ois-border bg-white shadow-lg py-1">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ois-text hover:bg-ois-surface-muted"
                onClick={() => { setMenuOpen(false); onGenerate(); }}
              >
                <Play size={12} />
                Generate now
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ois-text hover:bg-ois-surface-muted"
                onClick={() => { setMenuOpen(false); onViewVersions(); }}
              >
                <History size={12} />
                View versions
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};
