import React, { useMemo } from 'react';
import { mockCIs } from '@/src/mocks';
import type { ConfigurationItem } from '@/src/types/ci';

interface AiCompletenessPanelProps {
  onFillWithAI: (message: string) => void;
}

interface StatRow {
  label: string;
  count: number;
  total: number;
}

interface AttentionItem {
  publicId: string;
  name: string;
  reason: string;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden bg-white/10 w-full">
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: '#1F4FD4' }}
      />
    </div>
  );
}

function StatRowUI({ label, count, total }: StatRow) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 100;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-ois-text-muted flex-1">{label}</span>
        <span className="text-[11px] text-ois-text-subtle flex-shrink-0 tabular-nums">
          {count}/{total}
        </span>
        <span className="text-[11px] font-medium text-ois-text-primary flex-shrink-0 w-8 text-right tabular-nums">
          {pct}%
        </span>
      </div>
      <ProgressBar pct={pct} />
    </div>
  );
}

export const AiCompletenessPanel: React.FC<AiCompletenessPanelProps> = ({ onFillWithAI }) => {
  const { stats, attentionItems, noOwnerCIs, noMonitorCIs } = useMemo(() => {
    const cis: ConfigurationItem[] = mockCIs;
    const total = cis.length;

    const noOwner = cis.filter((ci) => !ci.ownerId || ci.ownerId === '');
    const noMonitor = cis.filter((ci) => ci.monitoringRuleCount === 0);

    const withOwner = total - noOwner.length;
    const withMonitor = total - noMonitor.length;

    const stats: StatRow[] = [
      { label: 'CI dengan owner', count: withOwner, total },
      { label: 'CI dengan monitoring', count: withMonitor, total },
    ];

    // Build attention items interleaved: no-owner first, then no-monitor
    const attention: AttentionItem[] = [];
    let o = 0;
    let m = 0;
    while (attention.length < 3 && (o < noOwner.length || m < noMonitor.length)) {
      if (o < noOwner.length) {
        attention.push({
          publicId: noOwner[o].publicId,
          name: noOwner[o].name,
          reason: 'no owner',
        });
        o++;
      }
      if (attention.length < 3 && m < noMonitor.length) {
        attention.push({
          publicId: noMonitor[m].publicId,
          name: noMonitor[m].name,
          reason: 'no monitor rule',
        });
        m++;
      }
    }

    return { stats, attentionItems: attention, noOwnerCIs: noOwner, noMonitorCIs: noMonitor };
  }, []);

  const handleFillWithAI = () => {
    const noOwnerList = noOwnerCIs.slice(0, 2).map((ci) => ci.publicId).join(' dan ');
    const message =
      noOwnerList
        ? `Bantu saya isi owner untuk ${noOwnerList}`
        : noMonitorCIs.length > 0
        ? `Bantu saya tambahkan monitoring rules untuk ${noMonitorCIs.slice(0, 2).map((ci) => ci.publicId).join(' dan ')}`
        : 'Bantu saya tingkatkan kelengkapan data CMDB';
    onFillWithAI(message);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Title */}
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ois-text-subtle m-0">
        Completeness
      </h3>

      {/* Stat rows */}
      <div className="flex flex-col gap-3">
        {stats.map((stat) => (
          <StatRowUI key={stat.label} {...stat} />
        ))}
      </div>

      {/* Attention section */}
      {attentionItems.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-ois-text-subtle">Perlu perhatian:</span>
          <div className="flex flex-col gap-1">
            {attentionItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <div
                  className="mt-[5px] flex-shrink-0 rounded-full"
                  style={{ width: 5, height: 5, backgroundColor: '#F79009' }}
                />
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="font-mono text-[11px] text-ois-text-primary">{item.publicId}</span>
                  <span className="text-[11px] text-ois-text-subtle">{item.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No issues */}
      {attentionItems.length === 0 && (
        <p className="text-[11px] text-ois-text-subtle italic m-0">
          Semua CI sudah lengkap.
        </p>
      )}

      {/* CTA */}
      <button
        onClick={handleFillWithAI}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded text-[11px] font-medium border border-ois-primary/40 text-ois-primary hover:bg-ois-primary/10 transition-colors"
      >
        ✦ Bantu isi dengan AI
      </button>
    </div>
  );
};
