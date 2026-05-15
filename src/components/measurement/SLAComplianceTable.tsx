import React from 'react';
import { cn } from '@/src/lib/utils';

export interface SLAComplianceRow {
  service: string;
  current: number | null;
  target:  number | null;
}

interface SLAComplianceTableProps {
  rows: SLAComplianceRow[];
}

export const SLAComplianceTable: React.FC<SLAComplianceTableProps> = ({ rows }) => {
  if (rows.length === 0) {
    return <div className="text-xs text-ois-text-muted py-6 text-center">No services configured.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ois-border">
            <th className="py-2 pr-4 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Service</th>
            <th className="py-2 pr-4 text-right text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Current</th>
            <th className="py-2 pr-4 text-right text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Target</th>
            <th className="py-2 text-center text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ois-border">
          {rows.map((row) => {
            const ok = row.current != null && row.target != null && row.current >= row.target;
            return (
              <tr key={row.service} className="hover:bg-ois-surface-muted/50 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-ois-text">{row.service}</td>
                <td className={cn('py-2.5 pr-4 text-right font-mono text-xs', row.current == null ? 'text-ois-text-subtle' : ok ? 'text-[#12B76A]' : 'text-[#F04438]')}>
                  {row.current == null ? '—' : `${row.current.toFixed(2)}%`}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono text-xs text-ois-text-subtle">
                  {row.target == null ? '—' : `${row.target.toFixed(2)}%`}
                </td>
                <td className="py-2.5 text-center">
                  {row.current == null || row.target == null ? (
                    <span className="text-ois-text-subtle text-sm">—</span>
                  ) : ok ? (
                    <span className="text-[#12B76A] font-bold text-sm">✓</span>
                  ) : (
                    <span className="text-[#F04438] font-bold text-sm">✗</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
