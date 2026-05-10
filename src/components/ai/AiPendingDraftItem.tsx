import React from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AiDraftCIPayload, AiDraftKBPayload } from '@/src/types/ai';
import { CITypeIcon } from '@/src/components/cmdb/CITypeIcon';

interface AiPendingDraftItemProps {
  payload: AiDraftCIPayload | AiDraftKBPayload;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AiPendingDraftItem: React.FC<AiPendingDraftItemProps> = ({
  payload,
  onConfirm,
  onCancel,
}) => {
  const isCIDraft = payload.kind === 'draft_ci';

  let title = '';
  let subtitle = '';
  let detail: string | null = null;

  if (isCIDraft) {
    const ci = payload as AiDraftCIPayload;
    title = ci.name;
    subtitle = `${ci.publicId} · ${ci.environment}`;
    detail =
      ci.relationships.length > 0
        ? `${ci.relationships.length} relasi pending`
        : null;
  } else {
    const kb = payload as AiDraftKBPayload;
    title = kb.title;
    subtitle = kb.category;
    detail = null;
  }

  return (
    <div
      className={cn(
        'rounded-lg flex flex-col gap-2 px-3 py-2.5',
        'border border-ois-border hover:border-ois-border-strong transition-colors'
      )}
    >
      {/* Icon + text */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">
          {isCIDraft ? (
            <CITypeIcon type={(payload as AiDraftCIPayload).type} size={12} showBackground />
          ) : (
            <div className="w-5 h-5 flex items-center justify-center rounded bg-white/5">
              <BookOpen size={12} className="text-ois-text-muted" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-ois-text-primary truncate m-0">{title}</p>
          <p className="text-[11px] text-ois-text-subtle truncate m-0">{subtitle}</p>
          {detail && (
            <p className="text-[11px] text-ois-text-subtle m-0 mt-0.5">{detail}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-1 rounded text-[11px] font-medium text-ois-primary border border-ois-primary/50 hover:bg-ois-primary/10 transition-colors"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1 rounded text-[11px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  );
};
