import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { authService } from '@/src/services/platformServices';
import { refreshAuthSession } from '../lib/auth/session';

export function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (newPassword !== confirm) { setError('New passwords do not match'); return; }
    if (newPassword === currentPassword) { setError('New password must differ from current'); return; }
    setBusy(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      await refreshAuthSession();
      navigate('/', { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to change password';
      setError(msg.includes('401') ? 'Current password is incorrect' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="text-sm text-gray-600">
          For security, please change the temporary password you received from your administrator.
        </p>
        <Input type="password" placeholder="Current password"
               value={currentPassword} onChange={e => setCurrent(e.target.value)} required />
        <Input type="password" placeholder="New password (≥ 8 characters)"
               value={newPassword} onChange={e => setNew(e.target.value)} required />
        <Input type="password" placeholder="Confirm new password"
               value={confirm} onChange={e => setConfirm(e.target.value)} required />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
