import React, { useState } from 'react';
import { ImprovementInitiative, ImprovementStatus, BenefitMeasurement } from '../../../types/improvement';
import { improvementStatusMeta } from '../../../lib/constants';
import { KanbanDragDropProvider } from './KanbanDragDropProvider';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  initiatives: ImprovementInitiative[];
  benefitMeasurements: BenefitMeasurement[];
  onNavigate: (publicId: string) => void;
}

const BOARD_STATUSES: ImprovementStatus[] = [
  'identified', 'evaluating', 'approved', 'in_progress', 'validating', 'completed',
];

export function KanbanBoard({ initiatives, benefitMeasurements, onNavigate }: KanbanBoardProps) {
  const [positions, setPositions] = useState<Record<string, ImprovementStatus>>({});
  const [toast, setToast] = useState<string | null>(null);

  function getStatus(initiative: ImprovementInitiative): ImprovementStatus {
    return positions[initiative.id] ?? initiative.status;
  }

  function handleDrop(initiativeId: string, targetStatus: ImprovementStatus) {
    setPositions((prev) => ({ ...prev, [initiativeId]: targetStatus }));
    const meta = improvementStatusMeta[targetStatus];
    setToast(`Status updated to ${meta.label}`);
    setTimeout(() => setToast(null), 3000);
  }

  const actualBenefitUSD = benefitMeasurements.reduce((sum, m) => sum + m.measuredValueUSD, 0);

  return (
    <KanbanDragDropProvider>
      <div className="relative">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
            {toast}
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_STATUSES.map((status) => {
            const col = initiatives.filter((i) => getStatus(i) === status);
            const totalBenefit = col.reduce((sum, i) => sum + i.estimatedBenefit.annualValueUSD, 0);
            return (
              <React.Fragment key={status}>
                <KanbanColumn
                  status={status}
                  initiatives={col}
                  totalBenefit={totalBenefit}
                  actualBenefit={status === 'completed' ? actualBenefitUSD : undefined}
                  onDrop={(id) => handleDrop(id, status)}
                  onNavigate={onNavigate}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </KanbanDragDropProvider>
  );
}
