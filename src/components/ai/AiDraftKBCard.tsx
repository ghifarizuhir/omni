import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle, X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AiDraftKBPayload } from '@/src/types/ai';
import { AiSuggestionChip } from './AiSuggestionChip';

interface AiDraftKBCardProps {
  payload: AiDraftKBPayload;
  onConfirm: () => void;
  onCancel: () => void;
}

interface SectionRowProps {
  heading: string;
  body: string;
}

const SectionRow: React.FC<SectionRowProps> = ({ heading, body }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-[11px] font-medium text-ois-text-primary">{heading}</span>
        {open ? (
          <ChevronDown size={12} className="text-ois-text-subtle flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-ois-text-subtle flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-1 bg-white/[0.02]">
          <p className="text-[12px] text-ois-text-muted leading-relaxed whitespace-pre-wrap m-0">{body}</p>
        </div>
      )}
    </div>
  );
};

export const AiDraftKBCard: React.FC<AiDraftKBCardProps> = ({ payload, onConfirm, onCancel }) => {
  const { draftStatus } = payload;

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const visibleSuggestions = payload.pendingSuggestions.filter(
    (s) => !dismissedIds.has(s.id) && !acceptedIds.has(s.id)
  );

  const handleAcceptSuggestion = (id: string) => {
    setAcceptedIds((prev) => new Set(prev).add(id));
  };

  const handleDismissSuggestion = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const containerStyle =
    draftStatus === 'pending'
      ? {
          border: '1px dashed #EF9F27',
          background: 'rgba(250, 238, 218, 0.08)',
          transition: 'border-color 0.3s ease, background 0.3s ease',
        }
      : draftStatus === 'confirmed'
      ? {
          border: '1px solid #3B6D11',
          background: 'rgba(234, 243, 222, 0.08)',
          transition: 'border-color 0.3s ease, background 0.3s ease',
        }
      : {
          border: '0.5px solid var(--color-ois-border)',
          background: 'var(--color-ois-surface-muted, rgba(255,255,255,0.03))',
          transition: 'border-color 0.3s ease, background 0.3s ease',
        };

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2.5" style={containerStyle}>
      {/* Header */}
      <div className="flex items-center gap-1.5">
        {draftStatus === 'pending' && (
          <>
            <FileText size={14} style={{ color: '#854F0B', flexShrink: 0 }} />
            <span className="text-[12px] font-medium" style={{ color: '#854F0B' }}>
              Draft KB Article — belum disimpan
            </span>
          </>
        )}
        {draftStatus === 'confirmed' && (
          <>
            <CheckCircle size={14} style={{ color: '#3B6D11', flexShrink: 0 }} />
            <span className="text-[12px] font-medium" style={{ color: '#3B6D11' }}>
              Draft dikirim ke KB — menunggu review
            </span>
          </>
        )}
        {draftStatus === 'cancelled' && (
          <>
            <X size={14} className="text-ois-text-subtle flex-shrink-0" />
            <span className="text-[12px] font-medium text-ois-text-subtle">Draft dibatalkan</span>
          </>
        )}
      </div>

      {/* Body */}
      <div className={cn('flex flex-col gap-2', draftStatus === 'cancelled' && 'opacity-50')}>
        {/* Title */}
        <p className="text-[14px] font-semibold text-ois-text-primary leading-snug m-0">
          {payload.title}
        </p>

        {/* Category + Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 uppercase tracking-wide">
            {payload.category}
          </span>
          {payload.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-ois-text-muted border border-ois-border"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Sections accordion */}
        {payload.sections.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ois-text-subtle">
              Sections
            </span>
            {payload.sections.map((section) => (
              <SectionRow key={section.heading} heading={section.heading} body={section.body} />
            ))}
          </div>
        )}

        {/* Related CIs */}
        {payload.relatedCiPublicIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ois-text-subtle">Terkait:</span>
            {payload.relatedCiPublicIds.map((ciId) => (
              <Link
                key={ciId}
                to={`/cmdb/${ciId}`}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-ois-text-muted border border-ois-border hover:text-ois-text-primary hover:border-ois-border-strong transition-colors"
              >
                {ciId}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {draftStatus === 'pending' && visibleSuggestions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {visibleSuggestions.map((suggestion) => (
            <AiSuggestionChip
              key={suggestion.id}
              text={suggestion.text}
              onAccept={() => handleAcceptSuggestion(suggestion.id)}
              onDismiss={() => handleDismissSuggestion(suggestion.id)}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {draftStatus === 'pending' && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded text-[11px] font-medium bg-ois-primary text-white hover:bg-ois-primary/90 transition-colors"
          >
            Confirm &amp; publish draft
          </button>
          <button type="button" className="px-3 py-1.5 rounded text-[11px] font-medium text-ois-text-muted hover:bg-white/5 transition-colors">
            Edit
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto px-2 py-1.5 rounded text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {draftStatus === 'confirmed' && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <Link
            to="/kb"
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium text-ois-text-muted hover:bg-white/5 border border-ois-border transition-colors"
          >
            Buka di KB
            <ExternalLink size={11} />
          </Link>
        </div>
      )}
    </div>
  );
};
