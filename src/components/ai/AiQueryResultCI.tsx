import React from 'react';
import { Link } from 'react-router-dom';
import type { AiQueryResultCIPayload } from '@/src/types/ai';
import type { ServiceHealthStatus } from '@/src/types/common';
import { ciTypeMeta } from '@/src/lib/constants';
import { CIHealthDot } from '@/src/components/cmdb/CIHealthDot';
import { formatAiTime } from './utils';

interface AiQueryResultCIProps {
  payload: AiQueryResultCIPayload;
  onAnalyze: () => void;
}

const criticalityColors: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'P1', color: '#B42318', bg: '#FEF3F2' },
  high:     { label: 'P2', color: '#DC6803', bg: '#FFFAEB' },
  medium:   { label: 'P3', color: '#B45309', bg: '#FFFBEB' },
  low:      { label: 'P4', color: '#027A48', bg: '#ECFDF3' },
};

export const AiQueryResultCI: React.FC<AiQueryResultCIProps> = ({ payload, onAnalyze }) => {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--color-ois-surface-muted, rgba(255,255,255,0.03))',
        border: '0.5px solid var(--color-ois-border-tertiary, rgba(255,255,255,0.07))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-[12px] font-medium text-ois-text-primary">
          {payload.query}
          {payload.totalFound > 0 && (
            <span className="ml-1.5 text-[11px] text-ois-text-subtle font-normal">
              — {payload.totalFound} ditemukan
            </span>
          )}
        </span>
        <span className="text-[10px] text-ois-text-subtle flex-shrink-0">
          {formatAiTime(payload.timestamp)}
        </span>
      </div>

      {/* CI rows */}
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {payload.items.map((item) => {
          const typeMeta = ciTypeMeta[item.type];
          const critMeta = criticalityColors[item.criticality];

          return (
            <div
              key={item.publicId}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors"
            >
              {/* Health dot */}
              <CIHealthDot health={item.health as ServiceHealthStatus} size="sm" />

              {/* Public ID */}
              <Link
                to={item.detailUrl}
                className="font-mono text-[11px] hover:underline flex-shrink-0 transition-colors"
                style={{ color: '#185FA5' }}
              >
                {item.publicId}
              </Link>

              {/* Name */}
              <span className="text-[12px] text-ois-text-muted flex-1 truncate">{item.name}</span>

              {/* Type chip */}
              {typeMeta && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                  style={{ color: typeMeta.color, backgroundColor: typeMeta.bg }}
                >
                  {typeMeta.label}
                </span>
              )}

              {/* Criticality badge */}
              {critMeta && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0"
                  style={{ color: critMeta.color, backgroundColor: critMeta.bg }}
                >
                  {critMeta.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
        <Link
          to="/cmdb"
          className="text-[11px] font-medium text-ois-text-muted hover:text-ois-text-primary border border-ois-border rounded px-2.5 py-1 hover:bg-white/5 transition-colors"
        >
          Buka di CMDB
        </Link>
        <button
          type="button"
          onClick={onAnalyze}
          className="text-[11px] font-medium text-ois-text-muted hover:text-ois-text-primary border border-ois-border rounded px-2.5 py-1 hover:bg-white/5 transition-colors"
        >
          Analisis AI →
        </button>
      </div>
    </div>
  );
};
