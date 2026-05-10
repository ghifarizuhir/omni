import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const PREF_KEY = 'ois-preferences';

type Theme = 'light' | 'dark' | 'system';
type DisplayDensity = 'comfortable' | 'compact' | 'spacious';
type TableDensity = 'default' | 'compact' | 'comfortable';
type DateFormat = 'relative' | 'absolute' | 'both';

interface Preferences {
  theme: Theme;
  displayDensity: DisplayDensity;
  tableDensity: TableDensity;
  dateFormat: DateFormat;
}

const defaultPrefs: Preferences = {
  theme: 'light',
  displayDensity: 'comfortable',
  tableDensity: 'default',
  dateFormat: 'relative',
};

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {}
  return defaultPrefs;
}

interface OptionGroupProps<T extends string> {
  label: string;
  options: Array<{ value: T; label: string; disabled?: boolean; hint?: string }>;
  value: T;
  onChange: (v: T) => void;
}

function OptionGroup<T extends string>({ label, options, value, onChange }: OptionGroupProps<T>) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ois-text-muted uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={cn(
              'flex flex-col items-start px-4 py-2.5 rounded-ois-btn border text-sm font-medium transition-all',
              value === opt.value
                ? 'border-ois-primary bg-ois-primary/5 text-ois-primary shadow-sm'
                : 'border-ois-border text-ois-text hover:border-ois-border-strong hover:bg-ois-surface-muted',
              opt.disabled && 'opacity-40 cursor-not-allowed hover:border-ois-border hover:bg-transparent'
            )}
          >
            {opt.label}
            {opt.hint && <span className="text-[10px] font-normal text-ois-text-muted mt-0.5">{opt.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export const AppearanceSettings: React.FC = () => {
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <OptionGroup<Theme>
        label="Theme"
        value={prefs.theme}
        onChange={v => update('theme', v)}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark', disabled: true, hint: 'Coming soon' },
          { value: 'system', label: 'System' },
        ]}
      />

      <OptionGroup<DisplayDensity>
        label="Display density"
        value={prefs.displayDensity}
        onChange={v => update('displayDensity', v)}
        options={[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
          { value: 'spacious', label: 'Spacious' },
        ]}
      />

      <OptionGroup<TableDensity>
        label="Table density"
        value={prefs.tableDensity}
        onChange={v => update('tableDensity', v)}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'compact', label: 'Compact' },
          { value: 'comfortable', label: 'Comfortable' },
        ]}
      />

      <OptionGroup<DateFormat>
        label="Date format"
        value={prefs.dateFormat}
        onChange={v => update('dateFormat', v)}
        options={[
          { value: 'relative', label: 'Relative', hint: '5 minutes ago' },
          { value: 'absolute', label: 'Absolute', hint: 'May 10, 2026' },
          { value: 'both', label: 'Both' },
        ]}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
          Save preferences
        </Button>
        {saved && (
          <span className="text-xs text-ois-success font-medium animate-in fade-in duration-200">
            Preferences saved
          </span>
        )}
      </div>
    </div>
  );
};
