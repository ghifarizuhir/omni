import React from 'react';
import { Card } from '../ui/Card';
import { ShieldCheck, ShieldAlert, Shield, Info, Lightbulb } from 'lucide-react';
import { DonutChart } from '../charts/DonutChart';

interface CoverageHealthSidebarProps {
  stats: {
    total: number;
    covered: number;
    uncovered: number;
    partiallyCovered: number;
  };
}

export const CoverageHealthSidebar: React.FC<CoverageHealthSidebarProps> = ({ stats }) => {
  const percentage = Math.round((stats.covered / stats.total) * 100);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h4 className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest mb-4">Total Coverage</h4>
        <div className="flex flex-col items-center">
          <DonutChart 
            size={140}
            data={[
              { label: 'Full', value: stats.covered, color: '#12B76A' },
              { label: 'Partial', value: stats.partiallyCovered, color: '#F79009' },
              { label: 'None', value: stats.uncovered, color: '#F04438' },
            ]}
          />
          <div className="text-center -mt-20 mb-12">
            <div className="text-3xl font-bold text-ois-text">{percentage}%</div>
            <div className="text-[10px] font-bold text-ois-text-subtle uppercase">Covered</div>
          </div>

          <div className="grid grid-cols-1 w-full gap-2 pt-4 border-t border-ois-border">
            <StatRow label="Full Coverage" count={stats.covered} color="bg-ois-success" />
            <StatRow label="Partial Coverage" count={stats.partiallyCovered} color="bg-ois-warning" />
            <StatRow label="No Coverage" count={stats.uncovered} color="bg-ois-danger" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-ois-info-pale/30 border-ois-info/20">
         <div className="flex items-center gap-2 mb-2 text-ois-info">
           <Lightbulb size={18} />
           <span className="text-xs font-bold uppercase tracking-wider">Coverage Insights</span>
         </div>
         <div className="space-y-3">
           <p className="text-xs font-medium text-ois-text-muted leading-relaxed">
             95% of your <span className="font-bold text-ois-text">Critical</span> CIs have at least one monitoring rule.
           </p>
           <p className="text-xs font-medium text-ois-text-muted leading-relaxed">
             Highest gap identified in <span className="font-bold text-ois-text">Load Balancer</span> type (40% uncovered).
           </p>
         </div>
      </Card>

      <Card className="p-4 flex items-center gap-3">
         <div className="w-10 h-10 rounded-full bg-ois-success-pale flex items-center justify-center text-ois-success shrink-0">
           <ShieldCheck size={20} />
         </div>
         <div>
           <div className="text-xs font-bold text-ois-text">Certification Status</div>
           <div className="text-[10px] font-medium text-ois-text-subtle uppercase">Last audited 2h ago</div>
         </div>
      </Card>
    </div>
  );
};

function StatRow({ label, count, color }: any) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs font-medium text-ois-text-muted">{label}</span>
      </div>
      <span className="text-xs font-bold text-ois-text">{count}</span>
    </div>
  );
}
