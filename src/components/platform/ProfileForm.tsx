import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

const TEAMS = [
  'Platform Engineering',
  'Site Reliability Engineering',
  'Security Operations',
  'Network Engineering',
  'Cloud Infrastructure',
  'DevOps',
  'IT Operations',
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'UTC', label: 'UTC' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
];

const MANAGERS = [
  'Helena Vasquez',
  'James Okafor',
  'Priya Nair',
  'Tom Bergmann',
  'Yuki Tanaka',
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
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ initialValues }) => {
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof ProfileFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const selectClass =
    'h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary';

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
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Team</label>
          <select className={selectClass} value={values.team} onChange={handleChange('team')}>
            {TEAMS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Manager</label>
          <select className={selectClass} value={values.manager} onChange={handleChange('manager')}>
            {MANAGERS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Timezone</label>
          <select className={selectClass} value={values.timezone} onChange={handleChange('timezone')}>
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ois-text-muted">Language</label>
          <select className={selectClass} value={values.language} onChange={handleChange('language')}>
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
      </div>
    </div>
  );
};
