import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle, X, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AiDraftCIPayload } from '@/src/types/ai';
import type { RelationshipType } from '@/src/types/ci';
import { ciTypeMeta, environmentMeta, relationshipTypeMeta } from '@/src/lib/constants';
import { CIRelationshipBadge } from '@/src/components/cmdb/CIRelationshipBadge';
import { CIStatusBadge } from '@/src/components/cmdb/CIStatusBadge';
import { AiSuggestionChip } from './AiSuggestionChip';
import { formatAiTime } from './utils';

interface AiDraftCICardProps {
  payload: AiDraftCIPayload;
  onConfirm: () => void;
  onCancel: () => void;
}

const criticalityMeta: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#B42318', bg: '#FEF3F2' },
  high:     { label: 'High',     color: '#DC6803', bg: '#FFFAEB' },
  medium:   { label: 'Medium',   color: '#0BA5EC', bg: '#F0F9FF' },
  low:      { label: 'Low',      color: '#475467', bg: '#F1F3F7' },
};

function SmallBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start min-h-[20px]">
      <span className="w-[90px] flex-shrink-0 text-[11px] text-ois-text-subtle leading-5">{label}</span>
      <div className="flex-1 flex items-center flex-wrap gap-1 min-w-0">{children}</div>
    </div>
  );
}

export const AiDraftCICard: React.FC<AiDraftCICardProps> = ({ payload, onConfirm, onCancel }) => {
  const { draftStatus } = payload;

  // Local state for managing suggestions and added-by-user relationships
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [userAddedRelationships, setUserAddedRelationships] = useState<
    Array<{ type: RelationshipType; targetCiPublicId: string; targetCiName: string; addedByUser: true }>
  >([]);

  const visibleSuggestions = payload.pendingSuggestions.filter(
    (s) => !dismissedIds.has(s.id) && !acceptedIds.has(s.id)
  );

  const handleAcceptSuggestion = (suggestionId: string) => {
    const suggestion = payload.pendingSuggestions.find((s) => s.id === suggestionId);
    if (suggestion && suggestion.actionType === 'add_relationship') {
      const ap = suggestion.actionPayload as {
        type?: RelationshipType;
        targetCiPublicId?: string;
        targetCiName?: string;
      };
      if (ap.type && ap.targetCiPublicId && ap.targetCiName) {
        setUserAddedRelationships((prev) => [
          ...prev,
          { type: ap.type!, targetCiPublicId: ap.targetCiPublicId!, targetCiName: ap.targetCiName!, addedByUser: true },
        ]);
      }
    }
    setAcceptedIds((prev) => new Set(prev).add(suggestionId));
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedIds((prev) => new Set(prev).add(suggestionId));
  };

  const allRelationships = [...payload.relationships, ...userAddedRelationships];

  const typeMeta = ciTypeMeta[payload.type];
  const envMeta = environmentMeta[payload.environment];
  const critMeta = criticalityMeta[payload.criticality];

  // State-based border/background styles
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
              Draft CI — belum disimpan
            </span>
          </>
        )}
        {draftStatus === 'confirmed' && (
          <>
            <CheckCircle size={14} style={{ color: '#3B6D11', flexShrink: 0 }} />
            <span className="text-[12px] font-medium" style={{ color: '#3B6D11' }}>
              Tersimpan ke CMDB
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

      {/* Field table */}
      <div className={cn('flex flex-col gap-1.5', draftStatus === 'cancelled' && 'opacity-50')}>
        <FieldRow label="Public ID">
          <span className="font-mono text-[12px] text-ois-text-primary">{payload.publicId}</span>
        </FieldRow>
        <FieldRow label="Name">
          <span className="font-mono text-[12px] text-ois-text-primary">{payload.name}</span>
        </FieldRow>
        <FieldRow label="Type">
          {typeMeta && (
            <SmallBadge label={typeMeta.label} color={typeMeta.color} bg={typeMeta.bg} />
          )}
        </FieldRow>
        <FieldRow label="Status">
          <CIStatusBadge status={payload.status} />
        </FieldRow>
        <FieldRow label="Environment">
          {envMeta && (
            <SmallBadge label={envMeta.label} color={envMeta.color} bg={envMeta.bg} />
          )}
        </FieldRow>
        <FieldRow label="Criticality">
          {critMeta && (
            <SmallBadge label={critMeta.label} color={critMeta.color} bg={critMeta.bg} />
          )}
        </FieldRow>
        <FieldRow label="Team">
          <span className="text-[12px] text-ois-text-primary">{payload.ownerTeamId}</span>
        </FieldRow>
        {payload.tags.length > 0 && (
          <FieldRow label="Tags">
            {payload.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-ois-text-muted border border-ois-border"
              >
                {tag}
              </span>
            ))}
          </FieldRow>
        )}
      </div>

      {/* Relationships */}
      {allRelationships.length > 0 && (
        <div className={cn('flex flex-col gap-1', draftStatus === 'cancelled' && 'opacity-50')}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ois-text-subtle">
            Relasi
          </span>
          {allRelationships.map((rel, idx) => (
            <div key={`${rel.type}-${rel.targetCiPublicId}-${idx}`} className="flex items-center gap-1.5">
              <CIRelationshipBadge type={rel.type as RelationshipType} />
              <span className="font-mono text-[11px] text-ois-text-muted hover:text-ois-text-primary transition-colors">
                {rel.targetCiPublicId}
              </span>
              <span className="text-[11px] text-ois-text-subtle truncate">{rel.targetCiName}</span>
              {rel.addedByUser && (
                <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-400">+added</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions — only when pending */}
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
            Confirm &amp; save
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded text-[11px] font-medium text-ois-text-muted hover:bg-white/5 transition-colors"
          >
            Edit field
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
            to={`/cmdb/${payload.publicId}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium text-ois-text-muted hover:bg-white/5 border border-ois-border transition-colors"
          >
            Buka di CMDB
            <ExternalLink size={11} />
          </Link>
        </div>
      )}
    </div>
  );
};
