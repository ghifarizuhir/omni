import React, { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { AlertChannel } from '../../../types/monitoring';

export interface ChannelConfig {
  destination: string;
  priorityFilter: 'all' | 'P1+' | 'P2+';
  quietHoursEnabled: boolean;
}

interface ConfigureChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: AlertChannel | null;
  initialConfig?: ChannelConfig;
  onSave: (channel: AlertChannel, config: ChannelConfig) => void;
}

const CHANNEL_META: Record<AlertChannel, { label: string; placeholder: string; destinationLabel: string }> = {
  email:   { label: 'Email',     placeholder: 'team@company.com',         destinationLabel: 'Address' },
  slack:   { label: 'Slack',     placeholder: '#platform-oncall',         destinationLabel: 'Channel' },
  teams:   { label: 'Teams',     placeholder: 'Platform On-Call channel', destinationLabel: 'Channel' },
  sms:     { label: 'SMS',       placeholder: '+1 555 555 0123',          destinationLabel: 'Phone number' },
  webhook: { label: 'Webhook',   placeholder: 'https://hooks.example.com/abc', destinationLabel: 'URL' },
  in_app:  { label: 'In-app',    placeholder: 'platform-team',            destinationLabel: 'Target group' },
};

export const ConfigureChannelModal: React.FC<ConfigureChannelModalProps> = ({
  isOpen, onClose, channel, initialConfig, onSave,
}) => {
  const [destination, setDestination] = useState(initialConfig?.destination ?? '');
  const [priorityFilter, setPriorityFilter] = useState<ChannelConfig['priorityFilter']>(initialConfig?.priorityFilter ?? 'all');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(initialConfig?.quietHoursEnabled ?? false);

  useEffect(() => {
    if (isOpen) {
      setDestination(initialConfig?.destination ?? '');
      setPriorityFilter(initialConfig?.priorityFilter ?? 'all');
      setQuietHoursEnabled(initialConfig?.quietHoursEnabled ?? false);
    }
  }, [isOpen, initialConfig]);

  if (!channel) return null;
  const meta = CHANNEL_META[channel];

  const handleSave = () => {
    onSave(channel, { destination: destination.trim(), priorityFilter, quietHoursEnabled });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configure ${meta.label}`} size="md">
      <div className="space-y-4 py-3">
        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">
            {meta.destinationLabel} *
          </label>
          <Input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder={meta.placeholder}
            className="mt-1.5"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">
            Send for severity
          </label>
          <div className="mt-2 flex gap-2">
            {(['all', 'P2+', 'P1+'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                  priorityFilter === p
                    ? 'bg-ois-primary text-white border-ois-primary'
                    : 'bg-white text-ois-text-muted border-ois-border hover:bg-ois-bg'
                }`}
              >
                {p === 'all' ? 'All severities' : p === 'P1+' ? 'P1 only' : 'P1 + P2'}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={quietHoursEnabled}
            onChange={e => setQuietHoursEnabled(e.target.checked)}
            className="rounded text-ois-primary"
          />
          <span className="text-sm text-ois-text">
            Respect quiet hours (22:00 – 07:00 local)
          </span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!destination.trim()} onClick={handleSave}>
            Save channel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
