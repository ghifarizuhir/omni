import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface IntegrationAction {
  label: string;
  handler: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
}

interface IntegrationCardProps {
  name: string;
  logo: string;
  connected: boolean;
  details: string[];
  description?: string;
  actions: IntegrationAction[];
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  name,
  logo,
  connected,
  details,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 bg-ois-surface border border-ois-border rounded-ois-card">
      {/* Logo */}
      <div className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-ois-surface-muted border border-ois-border text-2xl">
        {logo}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-ois-text">{name}</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
              connected
                ? 'bg-ois-success-pale text-ois-success border-ois-success/20'
                : 'bg-ois-surface-muted text-ois-text-muted border-ois-border'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                connected ? 'bg-ois-success' : 'bg-ois-text-muted/50'
              )}
            />
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {connected && details.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {details.map((d, i) => (
              <li key={i} className="text-xs text-ois-text-muted">
                {d}
              </li>
            ))}
          </ul>
        )}

        {!connected && description && (
          <p className="text-xs text-ois-text-muted mt-1">{description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? (i === 0 ? 'outline' : 'ghost')}
            size="sm"
            onClick={action.handler}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
