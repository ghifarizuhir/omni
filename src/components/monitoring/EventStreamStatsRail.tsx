import React from 'react';
import { Card } from '../ui/Card';
import { Activity, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { DonutChart } from '../charts/DonutChart';

interface EventStreamStatsRailProps {
  stats: {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    exception: number;
    warning: number;
    informational: number;
  };
}

export const EventStreamStatsRail: React.FC<EventStreamStatsRailProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h4 className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest mb-4">Event Distribution</h4>
        <div className="flex flex-col items-center">
          <DonutChart 
            size={120}
            data={[
              { label: 'Exception', value: stats.exception, color: '#B42318' },
              { label: 'Warning', value: stats.warning, color: '#DC6803' },
              { label: 'Info', value: stats.informational, color: '#475467' },
            ]}
          />
          <div className="grid grid-cols-1 w-full gap-2 mt-6">
            <StatItem label="Exception" value={stats.exception} color="bg-ois-danger" icon={AlertOctagon} />
            <StatItem label="Warning" value={stats.warning} color="bg-ois-warning" icon={AlertTriangle} />
            <StatItem label="Info" value={stats.informational} color="bg-ois-text-muted" icon={Activity} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest mb-4">Resolution Velocity</h4>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-ois-text">84%</div>
            <div className="text-[10px] font-bold text-ois-success uppercase">↑ 4% vs Yday</div>
          </div>
          <div className="w-full h-1.5 bg-ois-bg rounded-full overflow-hidden">
            <div className="h-full bg-ois-success" style={{ width: '84%' }} />
          </div>
          <p className="text-[10px] font-medium text-ois-text-muted leading-relaxed">
            Overall resolution rate for exceptional events within 1h of triggering.
          </p>
        </div>
      </Card>

      <Card className="p-4 bg-ois-primary text-white border-none shadow-lg shadow-ois-primary/20">
         <div className="flex items-center gap-3 mb-2">
           <CheckCircle2 size={18} />
           <span className="text-xs font-bold uppercase tracking-wider">Health Insight</span>
         </div>
         <p className="text-sm font-medium leading-relaxed opacity-90">
           90% of current high-severity events are correlated to a single problem root cause in the Payment Gateway.
         </p>
      </Card>
    </div>
  );
};

function StatItem({ label, value, color, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-ois-bg transition-colors">
      <div className="flex items-center gap-2">
        <div className={`w-1 h-4 ${color} rounded-full`} />
        <Icon size={14} className="text-ois-text-muted" />
        <span className="text-xs font-bold text-ois-text-muted">{label}</span>
      </div>
      <span className="text-xs font-bold text-ois-text">{value}</span>
    </div>
  );
}
