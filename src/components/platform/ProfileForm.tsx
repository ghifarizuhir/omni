import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { usersService } from '../../services';
import type { User } from '../../types';

const TIMEZONES = [
  { value: 'America/New_York',    label: 'America/New_York (ET)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'Europe/London',       label: 'Europe/London (GMT)' },
  { value: 'Europe/Berlin',       label: 'Europe/Berlin (CET)' },
  { value: 'Asia/Jakarta',        label: 'Asia/Jakarta (WIB)' },
  { value: 'Asia/Singapore',      label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo',          label: 'Asia/Tokyo (JST)' },
  { value: 'UTC',                 label: 'UTC' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
];

export interface ProfileFormValues {
  name: string;
  title: string;
  team: string;
  timezone: string;
  language: string;
  manager: string;
  bio: string;
}

interface ProfileFormProps {
  initialValues: ProfileFormValues;
  onSaved?: (user: User) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ initialValues, onSaved }) => {
  const [values, setValues]   = useState<ProfileFormValues>(initialValues);
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleChange = (field: keyof ProfileFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await usersService.updateMe({
        name:     values.name.trim(),
        title:    values.title.trim() || null,
        bio:      values.bio.trim() || null,
        timezone: values.timezone || null,
        language: values.language || null,
      });
      setSaved(true);
      onSaved?.(updated);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    'h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary disabled:bg-ois-surface-muted disabled:text-ois-text-muted';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          value={values.name}
          onChange={handleChange('name')}
        />
        <Input
          label="Job title"
          value={values.title}
          onChange={handleChange('title')}
          placeholder="e.g. Site Reliability Engineer"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Team</label>
          <input
            className={selectClass}
            value={values.team || '—'}
            disabled
            readOnly
          />
          <span className="text-[11px] text-ois-text-subtle">Managed by your administrator.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Manager</label>
          <input
            className={selectClass}
            value={values.manager || '—'}
            disabled
            readOnly
          />
          <span className="text-[11px] text-ois-text-subtle">Managed by your administrator.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Timezone</label>
          <select className={selectClass} value={values.timezone} onChange={handleChange('timezone')}>
            <option value="">—</option>
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Language</label>
          <select className={selectClass} value={values.language} onChange={handleChange('language')}>
            <option value="">—</option>
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-ois-text-muted">Bio</label>
        <textarea
          className="w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
          rows={3}
          value={values.bio}
          onChange={handleChange('bio')}
          placeholder="A short bio to help colleagues know you."
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} loading={saving} variant="primary" size="sm">
          Save changes
        </Button>
        {saved && (
          <span className="text-xs text-ois-success font-medium animate-in fade-in duration-200">
            Profile saved
          </span>
        )}
        {error && (
          <span className="text-xs text-ois-danger font-medium">{error}</span>
        )}
      </div>
    </div>
  );
};
