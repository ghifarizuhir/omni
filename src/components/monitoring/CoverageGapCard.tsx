import React from 'react';
import { Card } from '../ui/Card';
import { AlertTriangle, Plus, ChevronRight } from 'lucide-react';
import { CIType } from '../../types/ci';
import { ciTypeMeta } from '../../lib/constants';
import { getSuggestedRulesForCIType } from '../../lib/coverageHelpers';
import { Button } from '../ui/Button';

interface CoverageGapCardProps {
  type: CIType;
  gapCount: number;
  criticality: 'critical' | 'standard';
}

export const CoverageGapCard: React.FC<CoverageGapCardProps> = ({ type, gapCount, criticality }) => {
  const meta = ciTypeMeta[type];
  const suggestions = getSuggestedRulesForCIType(type).slice(0, 2);

  return (
    <Card className="flex flex-col h-full border-ois-border">
      <div className="p-4 border-b border-ois-border bg-ois-bg/30">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.bg, color: meta.color }}>
               {/* Icon would normally be dynamic */}
               <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ois-text">{meta.label}s</h4>
              <span className="text-[10px] font-bold text-ois-text-subtle uppercase">{gapCount} Unmonitored CIs</span>
            </div>
          </div>
          {criticality === 'critical' && (
            <div className="px-2 py-0.5 rounded bg-ois-danger text-white text-[10px] font-bold uppercase tracking-wider">
               Critical
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Recommended Rules</span>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-ois-bg border border-ois-border group cursor-pointer hover:border-ois-primary transition-all">
                <span className="text-xs font-medium text-ois-text-muted group-hover:text-ois-primary truncate">{s.name}</span>
                <ChevronRight size={12} className="text-ois-text-subtle group-hover:text-ois-primary" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 bg-ois-bg/30 border-t border-ois-border">
         <Button variant="primary" size="sm" className="w-full gap-2 text-xs font-bold h-8">
           <Plus size={14} /> Add Base Monitoring
         </Button>
      </div>
    </Card>
  );
};
