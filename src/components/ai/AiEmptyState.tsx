import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AiDomain } from '@/src/types/ai';

interface AiEmptyStateProps {
  domain: AiDomain;
  onSuggestionClick: (text: string) => void;
}

type DomainContent =
  | { type: 'suggestions'; items: string[] }
  | { type: 'coming_soon' };

function getDomainLabel(domain: AiDomain): string {
  switch (domain) {
    case 'cmdb': return 'CMDB';
    case 'knowledge_base': return 'Knowledge Base';
    case 'incident': return 'Incident';
    case 'problem': return 'Problem';
    case 'change': return 'Change';
    case 'all': return 'semua domain';
  }
}

function getDomainContent(domain: AiDomain): DomainContent {
  switch (domain) {
    case 'cmdb':
      return {
        type: 'suggestions',
        items: [
          'Tambah CI baru untuk server X',
          'Berapa CI dengan status degraded?',
          'CI mana yang belum punya owner?',
        ],
      };
    case 'knowledge_base':
      return {
        type: 'suggestions',
        items: [
          'Buatkan KB article tentang [topik]',
          'Cari artikel tentang timeout handling',
          'Draft runbook untuk restart payment-api',
        ],
      };
    case 'incident':
    case 'problem':
    case 'change':
      return { type: 'coming_soon' };
    case 'all':
      return {
        type: 'suggestions',
        items: [
          'Tanya tentang CI, incident, atau artikel KB',
          'Bandingkan kesehatan antar service',
          'Cari tren insiden bulan ini',
        ],
      };
  }
}

export const AiEmptyState: React.FC<AiEmptyStateProps> = ({ domain, onSuggestionClick }) => {
  const content = getDomainContent(domain);
  const domainLabel = getDomainLabel(domain);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center gap-3">
      {/* Icon circle */}
      <div
        className="flex items-center justify-center rounded-full mb-1"
        style={{ width: 52, height: 52, backgroundColor: '#E6F1FB' }}
      >
        <Sparkles size={22} style={{ color: '#185FA5' }} />
      </div>

      {/* Greeting */}
      <h3 className="text-[16px] font-semibold text-ois-text leading-tight m-0">
        Halo, Sarah!
      </h3>

      {/* Subtitle */}
      <p className="text-[13px] text-ois-text-muted m-0">
        Saya siap membantu kelola {domainLabel}.
      </p>

      {/* Suggested actions */}
      <div className="mt-2 w-full max-w-xs text-left">
        {content.type === 'suggestions' ? (
          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
            {content.items.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onSuggestionClick(item)}
                  className={cn(
                    'w-full text-left text-[12px] text-ois-text-muted px-3 py-1.5 rounded-md',
                    'border border-ois-border bg-ois-surface',
                    'hover:bg-ois-surface-muted hover:text-ois-text hover:border-ois-border-strong',
                    'transition-colors duration-100 cursor-pointer'
                  )}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-[12px] text-ois-text-subtle flex flex-col gap-1.5 items-center">
            <span>Domain ini belum tersedia di AI Chat Mode.</span>
            <a
              href={`/${domain}`}
              className="text-[12px] text-ois-primary hover:underline font-medium"
            >
              Gunakan Management Mode →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
