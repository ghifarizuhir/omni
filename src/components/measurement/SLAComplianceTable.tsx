import React from 'react';
import { cn } from '@/src/lib/utils';

interface SLAComplianceTableProps {
  timeRange: string;
}

const rows = [
  { service: 'Payment Svc',   current: 99.97, target: 99.95 },
  { service: 'Auth Svc',      current: 99.99, target: 99.99 },
  { service: 'Order Svc',     current: 99.82, target: 99.90 },
  { service: 'Search Svc',    current: 98.41, target: 99.50 },
  { service: 'Analytics',     current: 99.11, target: 99.00 },
  { service: 'Inventory',     current: 99.88, target: 99.90 },
  { service: 'Notifications', current: 99.95, target: 99.90 },
  { service: 'API Gateway',   current: 99.91, target: 99.95 },
];

export const SLAComplianceTable: React.FC<SLAComplianceTableProps> = () => {
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
            const ok = row.current >= row.target;
            return (
              <tr key={row.service} className="hover:bg-ois-surface-muted/50 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-ois-text">{row.service}</td>
                <td className={cn('py-2.5 pr-4 text-right font-mono text-xs', ok ? 'text-[#12B76A]' : 'text-[#F04438]')}>
                  {row.current.toFixed(2)}%
                </td>
                <td className="py-2.5 pr-4 text-right font-mono text-xs text-ois-text-subtle">
                  {row.target.toFixed(2)}%
                </td>
                <td className="py-2.5 text-center">
                  {ok ? (
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
