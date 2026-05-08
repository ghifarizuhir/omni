import React from 'react';
import { ConfigurationItem } from '../../../types/ci';
import { CITypeIcon } from '../CITypeIcon';
import { CIStatusBadge } from '../CIStatusBadge';
import { CIHealthDot } from '../CIHealthDot';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { X, ExternalLink, Activity, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GraphNodeSidePanelProps {
  ci: ConfigurationItem | null;
  onClose: () => void;
}

export const GraphNodeSidePanel: React.FC<GraphNodeSidePanelProps> = ({ ci, onClose }) => {
  const navigate = useNavigate();

  if (!ci) return null;

  return (
    <div className="w-80 bg-white border-l border-ois-border flex flex-col shadow-2xl animate-in slide-in-from-right-8">
      <div className="p-4 border-b border-ois-border flex items-center justify-between bg-ois-surface-muted/30">
        <div className="flex items-center gap-2">
           <CITypeIcon type={ci.type} size={14} />
           <span className="font-bold text-ois-text truncate max-w-[160px]">{ci.name}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ois-border rounded-md transition-colors">
          <X size={16} className="text-ois-text-subtle" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Header Stats */}
        <div className="flex flex-col items-center text-center p-4 bg-ois-bg rounded-xl border border-ois-border">
          <CITypeIcon type={ci.type} size={28} className="mb-4" />
          <div className="text-[10px] font-mono font-bold text-ois-text-subtle uppercase tracking-widest">{ci.publicId}</div>
          <h3 className="text-lg font-bold text-ois-text mb-2 leading-tight">{ci.name}</h3>
          <div className="flex items-center gap-2">
            <CIStatusBadge status={ci.status} />
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-ois-border text-[9px] font-bold uppercase tracking-tight">
               <Shield size={10} className="text-ois-primary" /> {ci.criticality}
            </div>
          </div>
        </div>

        {/* Health */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-ois-text">
              <Activity size={14} className="text-ois-primary" /> Health Status
            </div>
            <CIHealthDot health={ci.health} showRipple />
          </div>
          <div className="h-2 w-full bg-ois-surface-muted rounded-full overflow-hidden">
             <div className="h-full bg-ois-success w-[98%]" />
          </div>
          <div className="text-[10px] text-ois-text-subtle text-right">98.4% Uptime (30d)</div>
        </Card>

        {/* Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-ois-border p-3 rounded-lg text-center">
            <div className="text-[10px] uppercase font-bold text-ois-text-subtle mb-1">Incidents</div>
            <div className={cn("text-xl font-bold", ci.openIncidentCount > 0 ? "text-ois-danger" : "text-ois-text")}>{ci.openIncidentCount}</div>
          </div>
          <div className="bg-white border border-ois-border p-3 rounded-lg text-center">
            <div className="text-[10px] uppercase font-bold text-ois-text-subtle mb-1">Changes</div>
            <div className="text-xl font-bold text-ois-text">{ci.recentChangeCount}</div>
          </div>
        </div>

        {/* Attributes Preview */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest">Specifications</div>
          <div className="bg-ois-surface-muted/30 border border-ois-border rounded-lg p-3 space-y-2">
            {Object.entries(ci.attributes).filter(([k]) => k !== 'kind').slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[10px] text-ois-text-muted capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-[10px] font-bold text-ois-text truncate max-w-[120px]">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-ois-border bg-white space-y-2">
        <Button 
          variant="primary" 
          className="w-full gap-2"
          onClick={() => navigate(`/cmdb/${ci.id}`)}
        >
          View Full Detail <ExternalLink size={14} />
        </Button>
        <Button variant="ghost" className="w-full text-xs text-ois-text-subtle" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
