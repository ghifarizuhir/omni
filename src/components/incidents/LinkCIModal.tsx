import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { mockCIs } from '@/src/mocks/cis';
import { cn } from '@/src/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCIIds: string[];
  onLink: (ciIds: string[]) => void;
}

function healthBadge(health: string) {
  const map: Record<string, { label: string; cls: string }> = {
    operational: { label: 'Operational', cls: 'bg-green-50 text-green-700' },
    degraded:    { label: 'Degraded',    cls: 'bg-amber-50 text-amber-700' },
    outage:      { label: 'Outage',      cls: 'bg-red-50 text-red-700' },
  };
  const m = map[health] ?? { label: health, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', m.cls)}>
      {m.label}
    </span>
  );
}

export const LinkCIModal: React.FC<Props> = ({ isOpen, onClose, currentCIIds, onLink }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allCIs = mockCIs.filter(ci => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ci.publicId.toLowerCase().includes(q) || ci.name.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    if (currentCIIds.includes(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onLink([...selected]);
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link Configuration Item" size="md">
      <div className="py-4 space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full h-9 pl-8 pr-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>

        <div className="border border-ois-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          {allCIs.length === 0 ? (
            <p className="text-xs text-ois-text-subtle text-center py-8">No CIs found</p>
          ) : (
            allCIs.map(ci => {
              const linked = currentCIIds.includes(ci.id);
              const checked = linked || selected.has(ci.id);
              return (
                <label
                  key={ci.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 border-b border-ois-border last:border-0',
                    linked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-ois-surface-muted cursor-pointer',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={linked}
                    onChange={() => toggle(ci.id)}
                    className="w-4 h-4 rounded text-ois-primary"
                  />
                  <span className="font-mono text-xs text-ois-primary shrink-0">{ci.publicId}</span>
                  <span className="text-sm font-medium text-ois-text flex-1 truncate">{ci.name}</span>
                  <span className="text-xs text-ois-text-subtle capitalize shrink-0">{ci.type}</span>
                  {healthBadge(ci.health)}
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-ois-border mt-4">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={selected.size === 0}>
            Link {selected.size > 0 ? selected.size : ''} CI{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
