import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const SCOPES = [
  { id: 'read:incidents', label: 'read:incidents', description: 'View incidents and alerts' },
  { id: 'write:incidents', label: 'write:incidents', description: 'Create and update incidents' },
  { id: 'read:changes', label: 'read:changes', description: 'View change requests' },
  { id: 'write:changes', label: 'write:changes', description: 'Create and update changes' },
  { id: 'read:all', label: 'read:all', description: 'Read access to all resources' },
  { id: 'write:all', label: 'write:all', description: 'Write access to all resources' },
];

const FAKE_TOKEN = 'ois_tok_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

interface GenerateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (name: string, scope: string) => void;
}

export const GenerateTokenModal: React.FC<GenerateTokenModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
}) => {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nameError, setNameError] = useState('');

  const toggleScope = (scopeId: string) => {
    setSelectedScopes(prev => {
      const next = new Set(prev);
      if (next.has(scopeId)) next.delete(scopeId);
      else next.add(scopeId);
      return next;
    });
  };

  const handleGenerate = () => {
    if (!name.trim()) {
      setNameError('Token name is required');
      return;
    }
    setNameError('');
    setGeneratedToken(FAKE_TOKEN);
    onGenerated(name.trim(), Array.from(selectedScopes).join(' ') || 'read:all');
  };

  const handleCopy = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedScopes(new Set());
    setGeneratedToken(null);
    setCopied(false);
    setNameError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate API token" size="sm">
      <div className="py-4 space-y-5">
        {!generatedToken ? (
          <>
            <Input
              label="Token name"
              placeholder="e.g. CI/CD pipeline"
              value={name}
              onChange={e => { setName(e.target.value); setNameError(''); }}
              error={nameError}
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-ois-text-muted">Scopes</p>
              <div className="space-y-2">
                {SCOPES.map(scope => (
                  <label
                    key={scope.id}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.has(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      className="mt-0.5 h-4 w-4 rounded border-ois-border-strong text-ois-primary focus:ring-ois-primary/30 cursor-pointer"
                    />
                    <div>
                      <span className="block text-sm font-mono font-medium text-ois-text group-hover:text-ois-primary transition-colors">
                        {scope.label}
                      </span>
                      <span className="block text-xs text-ois-text-muted">{scope.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-ois-border">
              <Button variant="primary" size="sm" onClick={handleGenerate}>
                Generate token
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-ois-text-muted">
                Copy this token now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2 p-3 bg-ois-surface-muted rounded-ois-btn border border-ois-border">
                <code className="flex-1 text-xs font-mono text-ois-text break-all">
                  {generatedToken}
                </code>
                <button
                  onClick={handleCopy}
                  className={cn(
                    'shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors',
                    copied
                      ? 'text-ois-success bg-green-50'
                      : 'text-ois-text-muted hover:text-ois-text hover:bg-ois-border'
                  )}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Store this token securely. You cannot retrieve it after closing this dialog.
              </p>
            </div>

            <div className="pt-2 border-t border-ois-border">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
