import React from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

interface EntityToolbarProps {
  title: string;
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  rightSlot?: React.ReactNode;
}

export const EntityToolbar: React.FC<EntityToolbarProps> = ({
  title, count, search, onSearchChange, onCreate, createLabel = 'New', rightSlot,
}) => (
  <div className="flex flex-wrap items-center gap-3 mb-4">
    <div>
      <h2 className="text-base font-bold text-ois-text">{title}</h2>
      <div className="text-xs text-ois-text-muted">{count} record{count === 1 ? '' : 's'}</div>
    </div>
    <div className="ml-auto flex items-center gap-2">
      <div className="w-64">
        <Input
          icon={<Search size={14} />}
          placeholder="Search…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {rightSlot}
      {onCreate && (
        <Button onClick={onCreate} size="sm">
          <Plus size={14} className="mr-1" />
          {createLabel}
        </Button>
      )}
    </div>
  </div>
);
