import React, { useRef, useState } from 'react';
import { incidentsService } from '@/src/services';
import { cn } from '@/src/lib/utils';

interface IncidentComposerProps {
  incidentId: string;        // internal id used by the POST endpoint
  onPosted?: () => void;     // parent refetches timeline on success
  className?: string;
}

interface SlashChip {
  label: string;
  insert: string;
  hint: string;
}

const CHIPS: SlashChip[] = [
  { label: '/status',  insert: '/status ', hint: 'change status' },
  { label: '/page',    insert: '/page ',   hint: 'page on-call' },
  { label: '/link CI', insert: '/link CI ',hint: 'attach a CI' },
];

/**
 * Persistent bottom composer on the incident detail page. Replaces the
 * old modal-driven update flow. Visible slash-command chips insert the
 * command into the input + focus it; ⌘↵ submits.
 */
export const IncidentComposer: React.FC<IncidentComposerProps> = ({
  incidentId,
  onPosted,
  className,
}) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const body = value.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentsService.addComment(incidentId, { body, isInternal: false });
      setValue('');
      onPosted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post update');
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  const useChip = (chip: SlashChip) => {
    setValue(prev => (prev ? `${prev} ${chip.insert}` : chip.insert));
    inputRef.current?.focus();
  };

  return (
    <div className={cn('rounded-[8px] border border-ois-border bg-white overflow-hidden', className)}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ois-surface-muted bg-white">
        {CHIPS.map(chip => (
          <button
            key={chip.label}
            type="button"
            onClick={() => useChip(chip)}
            className="px-2 py-0.5 rounded border border-ois-border bg-ois-surface-muted font-mono text-[11px] text-ois-text-muted hover:bg-white hover:text-ois-text transition-colors"
            title={chip.hint}
          >
            {chip.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-ois-text-subtle">⌘↵ to post</span>
      </div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Post an update or run a slash command…"
        className="w-full px-3 py-2 outline-none resize-none text-[13px] text-ois-text placeholder:text-ois-text-subtle"
        disabled={submitting}
      />
      {error && (
        <div className="px-3 py-1.5 text-[12px] text-ois-danger border-t border-ois-surface-muted">{error}</div>
      )}
    </div>
  );
};
