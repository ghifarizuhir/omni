import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface APIToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string;
  scope: string;
}

interface APITokenRowProps {
  token: APIToken;
  onRevoke: () => void;
}

const scopeColor = (scope: string): string => {
  if (scope.startsWith('write')) return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (scope.startsWith('read')) return 'bg-sky-50 text-sky-700 border border-sky-200';
  return 'bg-ois-surface-muted text-ois-text-muted border border-ois-border';
};

export const APITokenRow: React.FC<APITokenRowProps> = ({ token, onRevoke }) => {
  const scopes = token.scope.split(' ').filter(Boolean);

  return (
    <tr className="border-b border-ois-border last:border-0 hover:bg-ois-surface-muted/40 transition-colors">
      <td className="py-3 px-4">
        <span className="text-sm font-medium text-ois-text">{token.name}</span>
      </td>
      <td className="py-3 px-4 text-sm text-ois-text-muted whitespace-nowrap">{token.createdAt}</td>
      <td className="py-3 px-4 text-sm text-ois-text-muted whitespace-nowrap">{token.lastUsed}</td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {scopes.map(s => (
            <span
              key={s}
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium font-mono',
                scopeColor(s)
              )}
            >
              {s}
            </span>
          ))}
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="text-ois-danger hover:bg-red-50 hover:text-red-700"
          onClick={onRevoke}
          title="Revoke token"
        >
          <Trash2 size={14} className="mr-1" />
          Revoke
        </Button>
      </td>
    </tr>
  );
};
