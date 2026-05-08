import React from 'react';
import { Terminal, Database, Search, Target, Plus, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Card } from '../../ui/Card';
import { mockCIs } from '../../../mocks';
import { cn } from '../../../lib/utils';

interface Step2ConditionsProps {
  data: any;
  updateData: (newData: any) => void;
}

export const Step2Conditions: React.FC<Step2ConditionsProps> = ({ data, updateData }) => {
  const [ciSearch, setCiSearch] = React.useState('');
  
  const filteredCIs = React.useMemo(() => {
    if (!ciSearch) return [];
    return mockCIs.filter(ci => 
      ci.name.toLowerCase().includes(ciSearch.toLowerCase()) || 
      ci.publicId.toLowerCase().includes(ciSearch.toLowerCase())
    ).slice(0, 5);
  }, [ciSearch]);

  const addCI = (ciPublicId: string) => {
    if (!data.targets.includes(ciPublicId)) {
      updateData({ targets: [...data.targets, ciPublicId] });
    }
    setCiSearch('');
  };

  const removeCI = (ciPublicId: string) => {
    updateData({ targets: data.targets.filter((id: string) => id !== ciPublicId) });
  };

  return (
    <div className="space-y-8">
      {/* Targets Selection */}
      <div>
        <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target size={14} className="text-ois-primary" /> Target Infrastructure (CIs)
        </label>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={16} />
            <Input 
              placeholder="Search CIs by name or public ID..." 
              className="pl-10 h-11"
              value={ciSearch}
              onChange={(e) => setCiSearch(e.target.value)}
            />
            {filteredCIs.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ois-border shadow-lg rounded-lg z-50 overflow-hidden">
                {filteredCIs.map(ci => (
                  <button
                    key={ci.id}
                    onClick={() => addCI(ci.publicId)}
                    className="w-full px-4 py-3 text-left hover:bg-ois-bg flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-ois-text">{ci.name}</p>
                      <p className="text-[11px] font-mono text-ois-text-subtle uppercase">{ci.publicId} · {ci.type}</p>
                    </div>
                    <Plus size={16} className="text-ois-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {data.targets.length === 0 ? (
              <p className="text-xs text-ois-text-subtle italic py-2">No targets selected yet. Rules must target at least one CI.</p>
            ) : (
              data.targets.map((id: string) => {
                const ci = mockCIs.find(c => c.publicId === id);
                return (
                  <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-ois-primary-pale text-ois-primary border border-ois-primary/20 rounded-lg group">
                    <span className="text-xs font-bold">{ci?.name || id}</span>
                    <button 
                      onClick={() => removeCI(id)}
                      className="text-ois-primary/60 hover:text-ois-danger transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Query/Condition Area */}
      <div>
        <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Terminal size={14} className="text-ois-primary" /> Detection Conditions
        </label>
        
        {data.type === 'threshold' && (
          <Card className="p-5 border-ois-border-strong bg-slate-50">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Metric</label>
                  <select className="w-full h-10 px-3 rounded-lg border border-ois-border-strong bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ois-primary/20">
                    <option>http_requests_total</option>
                    <option>cpu_usage_percent</option>
                    <option>memory_utilization</option>
                    <option>error_rate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Operator</label>
                  <select className="w-full h-10 px-3 rounded-lg border border-ois-border-strong bg-white text-sm font-medium">
                    <option>&gt;</option>
                    <option>&gt;=</option>
                    <option>&lt;</option>
                    <option>&lt;=</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Value</label>
                  <Input type="number" defaultValue={0.01} className="h-10" />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Duration</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-ois-text-muted">Condition must persist for</span>
                  <select className="px-3 h-8 rounded border border-ois-border-strong bg-white text-xs font-bold">
                    <option>5 minutes</option>
                    <option>10 minutes</option>
                    <option>15 minutes</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-ois-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Query Expression (Auto-generated)</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-emerald-400 text-xs shadow-inner min-h-[60px] flex items-center">
                  sum(rate(http_requests_total&#123;status=~"5.."&#125;[5m])) / sum(rate(http_requests_total[5m])) &gt; 0.01
                </div>
              </div>
            </div>
          </Card>
        )}

        {(data.type !== 'threshold') && (
          <div className="p-8 text-center bg-ois-bg rounded-xl border border-dashed border-ois-border">
            <Search size={32} className="mx-auto text-ois-text-subtle mb-3" />
            <p className="text-sm font-medium text-ois-text-muted">Configuring specialized {data.type} detection rules...</p>
            <p className="text-xs text-ois-text-subtle mt-1">This involves training models or defining complex pattern matchers.</p>
          </div>
        )}
      </div>
    </div>
  );
};
