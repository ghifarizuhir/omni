import React, { useState, useRef } from 'react';
import { MoreVertical, Play, FileEdit, Archive, Copy, ExternalLink } from 'lucide-react';
import { TestPlan } from '../../types/testing';
import { TestRunStatusBadge } from './TestRunStatusBadge';
import { TestPassRateBar } from './TestPassRateBar';
import { formatRelative } from '../../lib/format';
import { cn } from '../../lib/utils';

interface TestPlanRowProps {
  plan: TestPlan;
  onOpen: () => void;
}

const typeChipColors: Record<string, { color: string; bg: string }> = {
  release:    { color: '#067647', bg: '#ECFDF3' },
  regression: { color: '#1F4FD4', bg: '#EEF2FF' },
  smoke:      { color: '#0BA5EC', bg: '#F0F9FF' },
  load:       { color: '#DC6803', bg: '#FFFAEB' },
  security:   { color: '#B42318', bg: '#FEF3F2' },
  compliance: { color: '#6941C6', bg: '#F4F3FF' },
};

export const TestPlanRow: React.FC<TestPlanRowProps> = ({ plan, onOpen }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const typeStyle = typeChipColors[plan.type] ?? { color: '#475467', bg: '#F1F3F7' };

  return (
    <tr className="border-b border-ois-border hover:bg-ois-surface-muted transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-ois-text-muted">{plan.publicId}</span>
      </td>
      <td className="px-4 py-3">
        <button
          className="text-sm font-semibold text-ois-text hover:text-ois-primary text-left"
          onClick={onOpen}
        >
          {plan.name}
        </button>
      </td>
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 tracking-wide"
          style={{ color: typeStyle.color, background: typeStyle.bg }}
        >
          {plan.type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-ois-text-muted">{plan.componentName ?? '—'}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-semibold text-ois-text">{plan.caseCount}</span>
      </td>
      <td className="px-4 py-3">
        {plan.lastRunAt ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ois-text-muted">{formatRelative(plan.lastRunAt)}</span>
            {plan.lastRunStatus && <TestRunStatusBadge status={plan.lastRunStatus} size="sm" />}
          </div>
        ) : (
          <span className="text-xs text-ois-text-subtle">Never</span>
        )}
      </td>
      <td className="px-4 py-3 min-w-[120px]">
        <TestPassRateBar rate={plan.passRate30d} showLabel />
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-ois-text-muted">{plan.ownerName}</span>
      </td>
      <td className="px-4 py-3">
        <div className="relative" ref={menuRef}>
          <button
            className="p-1 rounded hover:bg-ois-border text-ois-text-muted"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-20 bg-ois-surface border border-ois-border rounded-lg shadow-lg py-1 min-w-[160px]"
              onBlur={() => setMenuOpen(false)}
            >
              {[
                { label: 'Open', icon: ExternalLink, action: onOpen },
                { label: 'Run now', icon: Play, action: () => {} },
                { label: 'Edit cases', icon: FileEdit, action: () => {} },
                { label: 'Archive', icon: Archive, action: () => {} },
                { label: 'Duplicate', icon: Copy, action: () => {} },
              ].map(({ label, icon: Icon, action }) => (
                <button
                  key={label}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-ois-text hover:bg-ois-surface-muted"
                  onClick={() => { setMenuOpen(false); action(); }}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};
