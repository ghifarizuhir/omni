import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { mockBIAEntries } from '@/src/mocks/biaEntries';
import { BIAEntry } from '@/src/types/continuity';
import { BIAMatrix } from '@/src/components/continuity/BIAMatrix';
import { BIAEntryRow } from '@/src/components/continuity/BIAEntryRow';
import { BIADetailDrawer } from '@/src/components/continuity/BIADetailDrawer';
import { Can } from '@/src/lib/rbac';

export const BIAMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState<BIAEntry | null>(null);

  const catastrophicCriticalCount = mockBIAEntries.filter(
    (e) => e.impactLevel === 'catastrophic' || e.impactLevel === 'critical',
  ).length;

  const rtoMin = Math.min(...mockBIAEntries.map((e) => e.rto));
  const rtoMax = Math.max(...mockBIAEntries.map((e) => e.rto));

  const handleOpenDRPlan = (_planPublicId: string) => {
    navigate('/continuity/dr-plans');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-ois-border bg-white shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-ois-text-subtle mb-3">
          <Link to="/" className="hover:text-ois-text transition-colors">Dashboard</Link>
          <ChevronRight size={13} />
          <span className="text-ois-text font-medium">Business Impact Analysis</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/"
                className="flex items-center gap-1 text-sm text-ois-text-subtle hover:text-ois-text transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-ois-text tracking-tight">Business Impact Analysis</h1>
            <p className="text-sm text-ois-text-subtle mt-0.5">
              {mockBIAEntries.length} services assessed &middot; {catastrophicCriticalCount} catastrophic/critical &middot; RTO targets: {rtoMin}&ndash;{rtoMax} min
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/continuity/dr-plans"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ois-text-subtle hover:text-ois-text border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors"
            >
              DR Plans
              <ChevronRight size={14} />
            </Link>
            <Link
              to="/continuity/tests"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ois-text-subtle hover:text-ois-text border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors"
            >
              DR Tests
              <ChevronRight size={14} />
            </Link>
            <Can module="continuity" action="update">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-ois-primary hover:bg-ois-primary/90 rounded-lg transition-colors">
                <Plus size={15} />
                New BIA entry
              </button>
            </Can>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-8">
          {/* BIA Impact Matrix */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-ois-text">BIA Impact Matrix</h2>
              <p className="text-sm text-ois-text-subtle mt-0.5">
                Services plotted by recovery time objective (rows) and business impact level (columns). Click a cell to view details.
              </p>
            </div>
            <div className="bg-white border border-ois-border rounded-xl p-4">
              <BIAMatrix entries={mockBIAEntries} onSelectEntry={setSelectedEntry} />
            </div>
          </section>

          {/* BIA Entries Table */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-ois-text">BIA Entries</h2>
              <p className="text-sm text-ois-text-subtle mt-0.5">
                Click any row to open the BIA detail drawer.
              </p>
            </div>
            <div className="bg-white border border-ois-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-ois-surface-muted border-b border-ois-border">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">Service</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">Impact Level</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">RTO</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">RPO</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">Hourly Cost</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">Compliance</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">DR Plan</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">Last Reviewed</th>
                      <th className="px-4 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ois-border">
                    {mockBIAEntries.map((entry) => (
                      <BIAEntryRow
                        key={entry.id}
                        entry={entry}
                        onOpen={setSelectedEntry}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Detail drawer */}
      <BIADetailDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onOpenDRPlan={handleOpenDRPlan}
      />
    </div>
  );
};
