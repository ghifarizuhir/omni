import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { continuityService, useResource } from '@/src/services';
import { BIAEntry } from '@/src/types/continuity';
import { BIAMatrix } from '@/src/components/continuity/BIAMatrix';
import { BIAEntryRow } from '@/src/components/continuity/BIAEntryRow';
import { BIADetailDrawer } from '@/src/components/continuity/BIADetailDrawer';
import { Can } from '@/src/lib/rbac';

export const BIAMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: biaData } = useResource(() => continuityService.bia(), []);
  const mockBIAEntries = biaData ?? [];
  const [selectedEntry, setSelectedEntry] = useState<BIAEntry | null>(null);

  const handleOpenDRPlan = (_planPublicId: string) => {
    navigate('/continuity/dr-plans');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 pt-4 pb-2 flex items-center justify-end gap-2 shrink-0">
        <Can module="continuity" action="update">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-ois-primary hover:bg-ois-primary/90 rounded-lg transition-colors">
            <Plus size={15} />
            New BIA entry
          </button>
        </Can>
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
