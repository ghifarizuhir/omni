import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Avatar } from '@/src/components/ui/Avatar';
import { usersService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';

interface UserPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSelect: (userId: string) => void;
  excludeIds?: string[];
}

export const UserPickerModal: React.FC<UserPickerModalProps> = ({
  isOpen,
  onClose,
  title,
  onSelect,
  excludeIds = [],
}) => {
  const [search, setSearch] = useState('');
  const { data: users } = useResource(() => usersService.list(), []);

  const candidates = (users ?? []).filter(user => {
    if (excludeIds.includes(user.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return user.name.toLowerCase().includes(q) || user.role.toLowerCase().includes(q);
  });

  const handleSelect = (userId: string) => {
    onSelect(userId);
    setSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="py-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or role…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-ois-border border border-ois-border rounded-lg mt-3">
          {candidates.length === 0 ? (
            <p className="text-xs text-ois-text-subtle text-center py-8">No users found</p>
          ) : (
            candidates.map(user => (
              <div
                key={user.id}
                onClick={() => handleSelect(user.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 hover:bg-ois-surface-muted cursor-pointer transition-colors'
                )}
              >
                <Avatar name={user.name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ois-text truncate">{user.name}</p>
                  <p className="text-xs text-ois-text-subtle capitalize">{user.role}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
