import React, { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { ConfigurationItem } from '../../../types/ci';
import { MonitoringRule } from '../../../types/monitoring';

export interface BulkRuleSuggestion {
  ci: ConfigurationItem;
  templates: string[];
}

interface BulkCreateRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: BulkRuleSuggestion[];
  onCreate: (rules: MonitoringRule[]) => void;
}

interface RowSelection {
  selected: boolean;
  template: string;
}

function templateToCondition(template: string): MonitoringRule['condition'] {
  const t = template.toLowerCase();
  if (t.includes('cpu') || t.includes('memory') || t.includes('disk')) {
    return { operator: '>', threshold: 80, duration: '5m', evaluationWindow: '5m' };
  }
  if (t.includes('latency')) {
    return { operator: '>', threshold: 500, duration: '5m', evaluationWindow: '5m' };
  }
  if (t.includes('error') || t.includes('5xx')) {
    return { operator: '>', threshold: 1, duration: '5m', evaluationWindow: '5m' };
  }
  return { operator: '>', threshold: 0, duration: '5m', evaluationWindow: '5m' };
}

function buildRule(ci: ConfigurationItem, template: string, offset: number): MonitoringRule {
  const ts = Date.now() + offset;
  const now = new Date().toISOString();
  return {
    id: `rule-bulk-${ts}`,
    publicId: `MRULE-${ts.toString().slice(-6)}`,
    name: `${template} — ${ci.name}`,
    description: `Auto-generated from coverage report for ${ci.publicId}`,
    type: 'threshold',
    enabled: true,
    source: 'prometheus',
    query: `${template.toLowerCase().replace(/[^a-z0-9]+/g, '_')}{ci="${ci.publicId}"}`,
    targetMode: 'explicit',
    targetCIIds: [ci.id],
    targetCount: 1,
    condition: templateToCondition(template),
    severity: ci.criticality === 'critical' ? 'P1' : ci.criticality === 'high' ? 'P2' : 'P3',
    cooldown: '15m',
    alertRouteId: 'route-default',
    alertRoutePublicId: 'ROUTE-DEFAULT',
    totalFires30d: 0,
    createdBy: 'You',
    createdAt: now,
    updatedAt: now,
    tags: ['auto-generated', 'coverage-bulk'],
  };
}

export const BulkCreateRulesModal: React.FC<BulkCreateRulesModalProps> = ({
  isOpen, onClose, suggestions, onCreate,
}) => {
  const [selection, setSelection] = useState<Record<string, RowSelection>>({});

  useEffect(() => {
    if (isOpen) {
      const seed: Record<string, RowSelection> = {};
      suggestions.forEach(s => {
        seed[s.ci.id] = { selected: true, template: s.templates[0] ?? 'Available' };
      });
      setSelection(seed);
    }
  }, [isOpen, suggestions]);

  const selectedCount = Object.values(selection).filter((s: RowSelection) => s.selected).length;

  const toggleAll = (selected: boolean) => {
    setSelection(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], selected }; });
      return next;
    });
  };

  const handleCreate = () => {
    const rules: MonitoringRule[] = suggestions
      .filter(s => selection[s.ci.id]?.selected)
      .map((s, i) => buildRule(s.ci, selection[s.ci.id].template, i));
    onCreate(rules);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk create monitoring rules" size="lg">
      <div className="space-y-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ois-text-muted">
            {suggestions.length} critical CI{suggestions.length === 1 ? '' : 's'} with zero coverage.
            Pick a starter template per CI — you can refine later.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="text-xs font-bold text-ois-primary hover:underline"
            >
              Select all
            </button>
            <span className="text-ois-border">|</span>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="text-xs font-bold text-ois-text-muted hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-ois-border overflow-hidden max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-ois-bg sticky top-0">
              <tr>
                <th className="w-10 px-3 py-2 text-left" />
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-ois-text-subtle">CI</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-ois-text-subtle">Type</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase text-ois-text-subtle">Template</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map(s => {
                const sel = selection[s.ci.id];
                if (!sel) return null;
                return (
                  <tr key={s.ci.id} className="border-t border-ois-border hover:bg-ois-bg/40">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={sel.selected}
                        onChange={e => setSelection(prev => ({
                          ...prev,
                          [s.ci.id]: { ...prev[s.ci.id], selected: e.target.checked },
                        }))}
                        className="rounded text-ois-primary"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-ois-text">{s.ci.name}</p>
                      <p className="font-mono text-[10px] text-ois-text-subtle">{s.ci.publicId}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-xs text-ois-text-muted">{s.ci.type.replace('_', ' ')}</td>
                    <td className="px-3 py-2">
                      <select
                        value={sel.template}
                        onChange={e => setSelection(prev => ({
                          ...prev,
                          [s.ci.id]: { ...prev[s.ci.id], template: e.target.value },
                        }))}
                        disabled={!sel.selected}
                        className="h-8 rounded-md border border-ois-border bg-white px-2 text-xs disabled:opacity-50"
                      >
                        {s.templates.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-ois-border">
          <p className="text-xs text-ois-text-muted">
            <span className="font-bold text-ois-text">{selectedCount}</span> rule{selectedCount === 1 ? '' : 's'} will be created.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={selectedCount === 0} onClick={handleCreate}>
              Create {selectedCount > 0 && `${selectedCount} rule${selectedCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
