import React from 'react';
import { Mail, MessageSquare, Phone, Bell, Webhook, MoreHorizontal, ArrowRight, User } from 'lucide-react';
import { Card } from '../ui/Card';
import { AlertRoute } from '../../types/monitoring';
import { mockTeams, mockUsers } from '../../mocks';
import { cn } from '../../lib/utils';

interface AlertRouteCardProps {
  route: AlertRoute;
  active?: boolean;
  onClick?: () => void;
}

export const AlertRouteCard: React.FC<AlertRouteCardProps> = ({ route, active, onClick }) => {
  const team = mockTeams.find(t => t.id === route.teamId);

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-all border outline-2 outline-transparent",
        active ? "border-ois-primary shadow-md" : "border-ois-border hover:border-ois-primary/30",
        active && "ring-1 ring-ois-primary"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-bold text-ois-text mb-0.5">{route.name}</h4>
          <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">{team?.name || 'Unassigned'}</span>
        </div>
        <button className="p-1 hover:bg-ois-bg rounded text-ois-text-subtle">
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        {route.channels.map(channel => (
          <div key={channel} className="w-6 h-6 rounded bg-ois-surface-muted flex items-center justify-center text-ois-text-muted">
            {getChannelIcon(channel)}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-ois-text-subtle">
           <ArrowRight size={10} /> {route.escalationSteps.length} Step{route.escalationSteps.length > 1 ? 's' : ''}
        </div>
      </div>
    </Card>
  );
};

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'email': return <Mail size={12} />;
    case 'slack': return <MessageSquare size={12} />;
    case 'teams': return <MessageSquare size={12} />;
    case 'sms': return <Phone size={12} />;
    case 'webhook': return <Webhook size={12} />;
    default: return <Bell size={12} />;
  }
}
