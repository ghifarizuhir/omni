import React from 'react';
import { Clock, User, Users, Trash2, GripVertical } from 'lucide-react';
import { Card } from '../ui/Card';
import { EscalationStep } from '../../types/monitoring';
import { mockUsers, mockTeams } from '../../mocks';
import { cn } from '../../lib/utils';

interface EscalationStepCardProps {
  step: EscalationStep;
  index: number;
  onDelete?: () => void;
}

export const EscalationStepCard: React.FC<EscalationStepCardProps> = ({ step, index, onDelete }) => {
  const users = mockUsers.filter(u => step.targets.userIds.includes(u.id));
  const teams = mockTeams.filter(t => step.targets.teamIds?.includes(t.id));

  return (
    <Card className="p-0 border-ois-border overflow-hidden group">
      <div className="flex items-stretch">
        <div className="w-10 bg-ois-bg border-r border-ois-border flex flex-col items-center py-3 gap-2">
           <GripVertical size={14} className="text-ois-text-subtle cursor-grab" />
           <span className="text-xs font-bold text-ois-text-muted">{index + 1}</span>
        </div>
        
        <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
               <Clock size={14} className="text-ois-text-subtle" />
               <span className="text-xs font-bold text-ois-text">After {step.delayMinutes === 0 ? 'Immediately' : `${step.delayMinutes} minutes`}</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
               {users.map(u => (
                 <div key={u.id} className="flex items-center gap-1.5 px-2 py-1 bg-ois-primary-pale text-ois-primary rounded text-xs font-medium">
                   <User size={12} /> {u.name}
                 </div>
               ))}
               {teams.map(t => (
                 <div key={t.id} className="flex items-center gap-1.5 px-2 py-1 bg-ois-info-pale text-ois-info rounded text-xs font-medium border border-ois-info/20">
                   <Users size={12} /> {t.name}
                 </div>
               ))}
            </div>
          </div>

          <button 
            onClick={onDelete}
            className="p-2 text-ois-text-subtle hover:text-ois-danger hover:bg-ois-danger-pale rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};
