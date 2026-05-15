import React, { useState } from 'react';
import { Camera, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ProfileForm } from '../../components/platform/ProfileForm';
import { APITokenRow } from '../../components/platform/APITokenRow';
import type { APIToken } from '../../components/platform/APITokenRow';
import { GenerateTokenModal } from '../../components/platform/GenerateTokenModal';
import { usersService, apiTokensService, useResource } from '../../services';

const SectionHeading: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <div className="mb-5">
    <h2 className="text-base font-bold text-ois-text">{title}</h2>
    {description && <p className="text-xs text-ois-text-muted mt-0.5">{description}</p>}
  </div>
);

export const Profile: React.FC = () => {
  const { data: user, refresh: refetchUser } = useResource(() => usersService.current(), []);
  const { data: tokenData, refresh: refetchTokens } = useResource(() => apiTokensService.list(), []);
  const [showGenModal, setShowGenModal] = useState(false);
  const [dangerAlert, setDangerAlert] = useState(false);

  const tokens: APIToken[] = (tokenData ?? []).map(t => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt.split('T')[0],
    lastUsed: t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : 'Never',
    scope: t.prefix,
  }));

  const handleRevoke = async (id: string) => {
    await apiTokensService.revoke(id);
    refetchTokens();
  };

  const handleRevokeAll = async () => {
    for (const t of tokens) {
      await apiTokensService.revoke(t.id);
    }
    refetchTokens();
  };

  const handleGenerated = async (name: string, _scope: string) => {
    await apiTokensService.create(name);
    refetchTokens();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-ois-text tracking-tight">My Profile</h1>
        <p className="text-sm text-ois-text-muted mt-1">
          Manage your personal information and account settings.
        </p>
      </div>

      <section className="flex items-start gap-5">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full bg-ois-primary flex items-center justify-center text-white text-2xl font-bold select-none overflow-hidden">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              : (user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '—')}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              disabled
              title="Photo upload is coming soon. Ask your administrator to update your avatar in the meantime."
            >
              <Camera size={13} />
              Change photo
            </Button>
          </div>
          <p className="text-lg font-bold text-ois-text leading-tight">{user?.name ?? '—'}</p>
          <p className="text-sm text-ois-text-muted">
            {user?.title ?? '—'}
            {user?.team ? <> · {user.team}</> : null}
          </p>
          <div className="flex flex-col gap-0.5 mt-2">
            <p className="text-xs text-ois-text-muted">{user?.email ?? '—'}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading title="Profile information" description="Update your display name, role, and contact preferences." />
        <ProfileForm
          key={user?.id ?? 'loading'}
          initialValues={{
            name:     user?.name ?? '',
            title:    user?.title ?? '',
            team:     user?.team ?? '',
            timezone: user?.timezone ?? '',
            language: user?.language ?? '',
            manager:  user?.manager?.name ?? '',
            bio:      user?.bio ?? '',
          }}
          onSaved={() => refetchUser()}
        />
      </section>

      <section id="tokens">
        <div className="flex items-center justify-between mb-4">
          <SectionHeading title="API tokens" description="Tokens you've generated to access the OIS API." />
          <div className="flex gap-2 shrink-0">
            {tokens.length > 0 && (
              <Button variant="ghost" size="sm" className="text-ois-danger hover:bg-red-50 hover:text-red-700 gap-1.5" onClick={handleRevokeAll}>
                <Trash2 size={13} />
                Revoke all
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowGenModal(true)}>
              <Plus size={14} />
              Generate new token
            </Button>
          </div>
        </div>

        {tokens.length === 0 ? (
          <div className="py-10 text-center text-sm text-ois-text-muted border border-dashed border-ois-border rounded-ois-card">
            No active tokens. Generate one to get started.
          </div>
        ) : (
          <div className="border border-ois-border rounded-ois-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-ois-surface-muted border-b border-ois-border">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Name</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Created</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Last used</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Prefix</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {tokens.map(token => (
                  <APITokenRow
                    key={token.id}
                    token={token}
                    onRevoke={() => handleRevoke(token.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border border-red-200 rounded-ois-card p-5 bg-red-50/50">
        <h2 className="text-sm font-bold text-red-700 mb-1">Danger zone</h2>
        <p className="text-xs text-red-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {dangerAlert && (
          <div className="flex items-start gap-2 p-3 mb-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            Account deletion is managed by your organization admin. Please contact your IT administrator.
          </div>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDangerAlert(true)}
        >
          Delete my account
        </Button>
      </section>

      <GenerateTokenModal
        isOpen={showGenModal}
        onClose={() => setShowGenModal(false)}
        onGenerated={handleGenerated}
      />
    </div>
  );
};

export default Profile;
