import React from 'react';
import { MonitoringRuleType, EventSource } from '../../../types/monitoring';
import { Severity } from '../../../types/common';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { ruleTypeMeta } from '../../../lib/constants';
import { cn } from '../../../lib/utils';

interface Step1DefineProps {
  data: any;
  updateData: (newData: any) => void;
}

export const Step1Define: React.FC<Step1DefineProps> = ({ data, updateData }) => {
  const ruleTypes: MonitoringRuleType[] = ['threshold', 'anomaly', 'log_pattern', 'synthetic', 'absence'];
  const severities: Severity[] = ['P1', 'P2', 'P3', 'P4'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5">Rule Name</label>
            <Input 
              placeholder="e.g. High Error Rate on Payment API" 
              value={data.name}
              onChange={(e) => updateData({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5">Description</label>
            <textarea 
              className="w-full bg-white border border-ois-border-strong rounded-lg p-3 text-sm focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary outline-none transition-all"
              placeholder="What does this rule detect?"
              rows={3}
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5">Default Severity</label>
            <div className="flex gap-2">
              {severities.map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => updateData({ severity: sev })}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                    data.severity === sev 
                      ? "bg-ois-primary text-white border-ois-primary" 
                      : "bg-white text-ois-text border-ois-border hover:border-ois-border-strong"
                  )}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5">Enabled</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateData({ enabled: !data.enabled })}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  data.enabled ? "bg-ois-success" : "bg-ois-border-strong"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  data.enabled ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
              <span className="text-sm font-medium text-ois-text-muted">
                {data.enabled ? 'Rule will start monitoring immediately' : 'Rule will be created in disabled state'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-3">Monitoring Type</label>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {ruleTypes.map(type => {
            const meta = ruleTypeMeta[type];
            const isSelected = data.type === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => updateData({ type })}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all flex flex-col gap-2 h-full",
                  isSelected 
                    ? "bg-ois-primary-pale border-ois-primary ring-1 ring-ois-primary/50" 
                    : "bg-white border-ois-border hover:border-ois-border-strong hover:bg-ois-bg"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-ois-primary text-white" : "bg-ois-bg text-ois-text-muted"
                )}>
                  {meta.icon && <meta.icon size={16} />}
                </div>
                <div>
                  <p className={cn("text-[11px] font-bold uppercase tracking-wider", isSelected ? "text-ois-primary" : "text-ois-text")}>
                    {meta.label}
                  </p>
                  <p className="text-[10px] text-ois-text-muted leading-tight mt-0.5">
                    {meta.description.split('.')[0]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
