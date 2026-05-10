import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface Note {
  name: string;
  time: string;
  text: string;
}

interface Props {
  notes: Note[];
  onAddNote?: (text: string) => void;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DRTestNotesLog: React.FC<Props> = ({ notes, onAddNote }) => {
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    if (draft.trim() && onAddNote) {
      onAddNote(draft.trim());
      setDraft('');
    }
  };

  return (
    <div className="space-y-3">
      {notes.length === 0 && (
        <p className="text-sm text-gray-400 italic">No notes yet.</p>
      )}
      <div className="space-y-2">
        {notes.map((note, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">
              {note.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-gray-700">{note.name}</span>
                <span className="text-[10px] text-gray-400">{formatTime(note.time)}</span>
              </div>
              <p className="text-sm text-gray-700">{note.text}</p>
            </div>
          </div>
        ))}
      </div>

      {onAddNote && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Add a note..."
            className="flex-1 h-8 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <Button variant="secondary" size="sm" onClick={handleSubmit} disabled={!draft.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
