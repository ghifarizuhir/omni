import React, { useState } from 'react';
import { Button } from '@/src/components/ui/Button';

export function NewPasswordModal({
  tempPassword,
  onClose,
}: { tempPassword: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Temporary password generated</h2>
        <p className="text-sm text-gray-600">
          Share this with the user via a secure channel. It will not be shown again.
          The user must change it at first login.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm break-all">
            {tempPassword}
          </code>
          <Button type="button" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>I&apos;ve saved it</Button>
        </div>
      </div>
    </div>
  );
}
