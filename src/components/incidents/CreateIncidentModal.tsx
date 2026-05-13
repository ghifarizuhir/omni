import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { cn } from '@/src/lib/utils';
import { IncidentPriority } from '@/src/types/incident';
import { usersService, useResource } from '@/src/services';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (publicId: string) => void;
}

const PRIORITIES: { value: IncidentPriority; label: string; desc: string }[] = [
  { value: 'P1', label: 'P1', desc: 'Critical' },
  { value: 'P2', label: 'P2', desc: 'High' },
  { value: 'P3', label: 'P3', desc: 'Medium' },
  { value: 'P4', label: 'P4', desc: 'Low' },
];

const CHANNELS = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'user_report', label: 'User report' },
  { value: 'self_service', label: 'Self-service' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'integration', label: 'Integration' },
] as const;

const CHANNEL_OPTIONS = CHANNELS.map(c => ({ value: c.value, label: c.label }));

export const CreateIncidentModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const { data: users } = useResource(() => usersService.list(), []);
  const ASSIGNEE_OPTIONS = [
    { value: '', label: 'Unassigned' },
    ...(users ?? []).map(u => ({ value: u.id, label: u.name })),
  ];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IncidentPriority>('P2');
  const [channel, setChannel] = useState<string>('phone');
  const [assigneeId, setAssigneeId] = useState('');

  const priorityColors: Record<IncidentPriority, string> = {
    P1: 'border-red-400 bg-red-50 text-red-700',
    P2: 'border-amber-400 bg-amber-50 text-amber-700',
    P3: 'border-yellow-400 bg-yellow-50 text-yellow-700',
    P4: 'border-green-400 bg-green-50 text-green-700',
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const newId = `INC-2026-${String(Math.floor(Math.random() * 99) + 185).padStart(5, '0')}`;
    onCreated(newId);
    setTitle('');
    setDescription('');
    setPriority('P2');
    setChannel('phone');
    setAssigneeId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Incident" size="md">
      <div className="py-4 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-ois-text mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Brief, descriptive summary"
            className="w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-ois-text mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Markdown supported"
            rows={4}
            className="w-full px-3 py-2 text-sm border border-ois-border rounded-lg bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary resize-none"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-ois-text mb-2">
            Priority <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {PRIORITIES.map(p => (
              <label
                key={p.value}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all',
                  priority === p.value
                    ? priorityColors[p.value]
                    : 'border-ois-border text-ois-text-subtle hover:border-ois-border-strong'
                )}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p.value}
                  checked={priority === p.value}
                  onChange={() => setPriority(p.value)}
                  className="sr-only"
                />
                <span className="font-bold">{p.label}</span>
                <span className="text-xs font-normal">{p.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-ois-text mb-1">Assignee</label>
          <FilterDropdown
            value={assigneeId}
            onChange={setAssigneeId}
            options={ASSIGNEE_OPTIONS}
            placeholder="Unassigned"
            fullWidth
          />
        </div>

        {/* Reporter channel */}
        <div>
          <label className="block text-sm font-medium text-ois-text mb-1">Reporter channel</label>
          <FilterDropdown
            value={channel}
            onChange={setChannel}
            options={CHANNEL_OPTIONS}
            placeholder="Select channel"
            fullWidth
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
};
