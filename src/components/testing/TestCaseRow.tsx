import React, { useState } from 'react';
import { MoreVertical, ExternalLink, FileEdit, Play, Archive, Check } from 'lucide-react';
import { TestCase } from '../../types/testing';
import { testCasePriorityMeta, testStepResultMeta } from '../../lib/constants';
import { FlakyTestBadge } from './FlakyTestBadge';
import { formatRelative } from '../../lib/format';
import * as Icons from 'lucide-react';
import { cn } from '../../lib/utils';

interface TestCaseRowProps {
  testCase: TestCase;
  onOpen: () => void;
}

const typeColors: Record<string, { color: string; bg: string }> = {
  functional:   { color: '#1F4FD4', bg: '#EEF2FF' },
  integration:  { color: '#6941C6', bg: '#F4F3FF' },
  smoke:        { color: '#0BA5EC', bg: '#F0F9FF' },
  performance:  { color: '#DC6803', bg: '#FFFAEB' },
  security:     { color: '#B42318', bg: '#FEF3F2' },
  manual:       { color: '#475467', bg: '#F1F3F7' },
};

export const TestCaseRow: React.FC<TestCaseRowProps> = ({ testCase, onOpen }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const priorityMeta = testCasePriorityMeta[testCase.priority];
  const typeStyle = typeColors[testCase.type] ?? { color: '#475467', bg: '#F1F3F7' };
  const lastResultMeta = testCase.lastResult ? testStepResultMeta[testCase.lastResult] : null;
  const LastResultIcon = lastResultMeta
    ? (Icons as Record<string, React.FC<{ size?: number; className?: string }>>)[lastResultMeta.icon]
    : null;

  return (
    <tr className="border-b border-ois-border hover:bg-ois-surface-muted transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-ois-text-muted">{testCase.publicId}</span>
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        <button
          className="text-sm font-semibold text-ois-text hover:text-ois-primary text-left truncate block w-full"
          onClick={onOpen}
        >
          {testCase.title}
        </button>
      </td>
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5 tracking-wide"
          style={{ color: typeStyle.color, background: typeStyle.bg }}
        >
          {testCase.type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className="text-[10px] font-bold rounded-full px-2 py-0.5"
          style={{ color: priorityMeta.color, background: priorityMeta.bg }}
        >
          {priorityMeta.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {testCase.isAutomated ? (
          <span className="flex items-center gap-1 text-xs text-[#067647]">
            <Check size={12} />
            {testCase.automationFramework ?? 'automated'}
          </span>
        ) : (
          <span className="text-xs text-ois-text-subtle">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-semibold text-ois-text">{testCase.containedInPlans.length}</span>
      </td>
      <td className="px-4 py-3">
        {testCase.lastExecutedAt && lastResultMeta ? (
          <div className="flex items-center gap-1.5">
            {LastResultIcon && (
              <LastResultIcon
                size={13}
                className={cn(testCase.lastResult === 'running' && 'animate-spin')}
              />
            )}
            <span className="text-xs text-ois-text-muted" style={{ color: lastResultMeta.color }}>
              {formatRelative(testCase.lastExecutedAt)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-ois-text-subtle">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {testCase.flakeRate ? (
          <FlakyTestBadge flakeRate={testCase.flakeRate} />
        ) : (
          <span className="text-xs text-ois-text-subtle">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="relative">
          <button
            className="p-1 rounded hover:bg-ois-border text-ois-text-muted"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 bg-ois-surface border border-ois-border rounded-lg shadow-lg py-1 min-w-[160px]">
              {[
                { label: 'Open', icon: ExternalLink, action: onOpen },
                { label: 'Edit steps', icon: FileEdit, action: () => {} },
                { label: 'Run individually', icon: Play, action: () => {} },
                { label: 'Archive', icon: Archive, action: () => {} },
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
