import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface Step3DeliveryProps {
  onBack: () => void;
  onSubmit: () => void;
}

export const Step3Delivery: React.FC<Step3DeliveryProps> = ({ onBack, onSubmit }) => {
  const [recipients, setRecipients] = useState<string[]>(['sarah.chen@acme.io']);
  const [newEmail, setNewEmail] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [inApp, setInApp] = useState(true);

  const addEmail = () => {
    const trimmed = newEmail.trim();
    if (trimmed && !recipients.includes(trimmed)) {
      setRecipients((prev) => [...prev, trimmed]);
    }
    setNewEmail('');
    setShowInput(false);
  };

  const removeEmail = (email: string) => setRecipients((prev) => prev.filter((r) => r !== email));

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Recipients */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Recipients</label>
        <div className="flex flex-wrap gap-2">
          {recipients.map((email) => (
            <span key={email} className="inline-flex items-center gap-1 rounded-full bg-ois-surface-muted border border-ois-border px-2.5 py-0.5 text-xs font-medium text-ois-text">
              {email}
              <button onClick={() => removeEmail(email)} className="hover:text-red-500">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>

        {showInput ? (
          <div className="flex gap-2 mt-1">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEmail()}
              placeholder="email@company.com"
              autoFocus
              className="h-8 flex-1 rounded-lg border border-ois-border px-3 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
            />
            <Button variant="primary" size="sm" onClick={addEmail}>Add</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowInput(false)}>Cancel</Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1 self-start text-xs text-ois-primary font-medium hover:underline"
          >
            <Plus size={12} /> Add email
          </button>
        )}
      </div>

      {/* In-app notification */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Notifications</label>
        <label className="flex items-center gap-2.5 text-sm text-ois-text cursor-pointer">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(e) => setInApp(e.target.checked)}
            className="rounded accent-ois-primary"
          />
          In-app notification when report is ready
        </label>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-ois-border">
        <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSubmit}>Save draft</Button>
          <Button variant="primary" size="sm" onClick={onSubmit}>Create report</Button>
        </div>
      </div>
    </div>
  );
};
