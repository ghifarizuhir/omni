import React from 'react';
import { Bell, Info, AlertTriangle, CheckCircle2, MoreHorizontal, Settings } from 'lucide-react';
import { mockAlertRoutes } from '../../../mocks';
import { Badge } from '../../ui/Badge';
import { cn } from '../../../lib/utils';
import { channelMeta } from '../../../lib/constants';

interface Step3RoutingProps {
  data: any;
  updateData: (newData: any) => void;
}

export const Step3Routing: React.FC<Step3RoutingProps> = ({ data, updateData }) => {
  return (
    <div className="space-y-8">
      {/* Route Selection */}
      <div>
        <label className="block text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bell size={14} className="text-ois-primary" /> Notification Route
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockAlertRoutes.map(route => {
            const isSelected = data.routingPublicId === route.id;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => updateData({ routingPublicId: route.id })}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all relative group",
                  isSelected 
                    ? "bg-ois-primary-pale border-ois-primary ring-1 ring-ois-primary/50 shadow-md" 
                    : "bg-white border-ois-border hover:border-ois-border-strong hover:bg-ois-bg"
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 size={18} className="text-ois-primary" />
                  </div>
                )}
                <div className="mb-3">
                  <p className={cn("text-[11px] font-mono font-bold uppercase", isSelected ? "text-ois-primary" : "text-ois-text-subtle")}>
                    {route.id}
                  </p>
                  <h4 className="text-sm font-bold text-ois-text mt-0.5">{route.name}</h4>
                </div>
                <p className="text-xs text-ois-text-muted mb-4 leading-relaxed line-clamp-2">
                  {route.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {route.channels.map(channel => {
                    const meta = channelMeta[channel];
                    return (
                      <Badge 
                        key={channel} 
                        variant="neutral" 
                        className="bg-white text-ois-text-muted border-ois-border text-[9px] px-1.5 py-0 h-4 gap-1"
                      >
                         {meta?.icon && <meta.icon size={10} />}
                         {meta?.label || channel}
                      </Badge>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Review Section */}
      <div className="bg-ois-bg rounded-xl border border-ois-border p-6 shadow-inner">
        <h4 className="text-xs font-bold text-ois-text uppercase tracking-widest mb-4 flex items-center gap-2">
          <Info size={14} className="text-ois-primary" /> Summary Preview
        </h4>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
             <div className="w-10 h-10 rounded-full bg-white border border-ois-border flex items-center justify-center flex-shrink-0">
                <Settings size={18} className="text-ois-text-muted" />
             </div>
             <div>
                <p className="text-sm font-bold text-ois-text">{data.name || 'Untitled Rule'}</p>
                <p className="text-xs text-ois-text-muted mt-0.5">
                  {data.type.toUpperCase()} detection for {data.targets.length} targets. 
                  Notifications will be sent via {mockAlertRoutes.find(r => r.id === data.routingPublicId)?.name || 'default route'}.
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold mt-2">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-ois-border rounded text-ois-danger">
                <AlertTriangle size={12} /> Severity: {data.severity}
             </div>
             <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-ois-border rounded text-ois-success">
                <CheckCircle2 size={12} /> Status: {data.enabled ? 'Enabled' : 'Disabled'}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
