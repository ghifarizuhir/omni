import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { motion } from 'motion/react';
import { mockInboxItems } from '@/src/mocks';
import { formatRelative } from '@/src/lib/format';
import { cn } from '@/src/lib/utils';

interface InboxDrawerProps {
  onClose: () => void;
}

export const InboxDrawer: React.FC<InboxDrawerProps> = ({ onClose }) => {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'approval'>('all');

  const filteredItems = mockInboxItems.filter(item => {
    if (filter === 'urgent') return item.priority === 'urgent';
    if (filter === 'approval') return item.type === 'approval';
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
      />

      {/* Drawer */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-white shadow-ois-modal z-[101] flex flex-col"
      >
        <div className="p-5 border-b border-ois-border flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-ois-text">Inbox</h2>
            <p className="text-xs text-ois-text-muted">Action required for you</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-ois-border flex items-center gap-2 overflow-x-auto no-scrollbar">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>All {mockInboxItems.length}</FilterPill>
          <FilterPill active={filter === 'urgent'} onClick={() => setFilter('urgent')} variant="urgent">Urgent {mockInboxItems.filter(i => i.priority === 'urgent').length}</FilterPill>
          <FilterPill active={filter === 'approval'} onClick={() => setFilter('approval')}>Approvals {mockInboxItems.filter(i => i.type === 'approval').length}</FilterPill>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-ois-border">
          {filteredItems.map(item => (
            <div key={item.id} className="p-5 hover:bg-ois-surface-muted transition-colors cursor-pointer group relative">
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                item.priority === 'urgent' ? "bg-ois-danger" : "bg-transparent"
              )} />
              
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">
                    {item.priority === 'urgent' && <span className="text-ois-danger">● URGENT</span>}
                    <span>{item.type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="font-mono">{item.sourceRef}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-ois-text leading-tight">{item.title}</h3>
                </div>
                <div className={cn(
                  "text-[11px] font-medium whitespace-nowrap",
                  item.priority === 'urgent' ? "text-ois-danger" : "text-ois-text-subtle"
                )}>
                  Due {formatRelative(item.dueAt)}
                </div>
              </div>
              
              <p className="text-sm text-ois-text-muted line-clamp-2 mb-4">{item.body}</p>
              
              <div className="flex items-center gap-2">
                {item.type === 'approval' ? (
                  <>
                    <Button size="sm" variant="primary">Approve</Button>
                    <Button size="sm" variant="outline">Reject</Button>
                  </>
                ) : item.type === 'escalation' ? (
                  <Button size="sm" variant="primary">Acknowledge</Button>
                ) : (
                  <Button size="sm" variant="outline">Mark as done</Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
};

const FilterPill: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode, variant?: 'default' | 'urgent' }> = ({ active, onClick, children, variant = 'default' }) => (
  <button 
    onClick={onClick}
    className={cn(
      "whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all border",
      active 
        ? (variant === 'urgent' ? "bg-ois-danger border-ois-danger text-white" : "bg-ois-primary border-ois-primary text-white")
        : "bg-ois-surface border-ois-border text-ois-text-muted hover:border-ois-text-muted"
    )}
  >
    {children}
  </button>
);
