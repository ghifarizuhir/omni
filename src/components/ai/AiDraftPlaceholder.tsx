import React from 'react';
import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import type { AiDomain } from '@/src/types/ai';
import { getDomainLabel } from './utils';

interface AiDraftPlaceholderProps {
  domain: AiDomain;
}

const domainRoute: Partial<Record<AiDomain, string>> = {
  incident: '/incidents',
  problem: '/problems',
  change: '/changes',
};

export const AiDraftPlaceholder: React.FC<AiDraftPlaceholderProps> = ({ domain }) => {
  const label = getDomainLabel(domain);
  const route = domainRoute[domain] ?? '/';

  return (
    <div
      className="rounded-lg p-4 flex flex-col items-start gap-3"
      style={{
        border: '1px dashed var(--color-ois-border, rgba(255,255,255,0.1))',
        background: 'var(--color-ois-surface-muted, rgba(255,255,255,0.03))',
      }}
    >
      {/* Icon */}
      <Construction size={20} className="text-ois-text-subtle" />

      {/* Copy */}
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-medium text-ois-text-primary m-0">
          Domain ini belum tersedia
        </p>
        <p className="text-[12px] text-ois-text-muted leading-relaxed m-0">
          <span className="font-medium">{label}</span> Management akan hadir di versi berikutnya.
          Gunakan Management Mode untuk mengelola {label.toLowerCase()} sekarang.
        </p>
      </div>

      {/* CTA */}
      <Link
        to={route}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-[12px] font-medium text-ois-text-muted border border-ois-border hover:bg-white/5 hover:text-ois-text-primary transition-colors"
      >
        Buka {label} →
      </Link>
    </div>
  );
};
