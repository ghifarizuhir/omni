import React, { useState } from 'react';
import { ImprovementInitiative, BenefitMeasurement, BenefitType } from '../../../types/improvement';
import { benefitTypeMeta } from '../../../lib/constants';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

interface LogBenefitModalProps {
  open: boolean;
  initiatives: ImprovementInitiative[];
  onClose: () => void;
  onSubmit: (data: Partial<BenefitMeasurement>) => void;
}

const BENEFIT_TYPES = Object.keys(benefitTypeMeta) as BenefitType[];

export function LogBenefitModal({ open, initiatives, onClose, onSubmit }: LogBenefitModalProps) {
  const [initiativeId, setInitiativeId] = useState('');
  const [date, setDate] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [benefitType, setBenefitType] = useState<BenefitType>('cost_reduction');
  const [isEstimate, setIsEstimate] = useState(false);
  const [value, setValue] = useState('');
  const [evidence, setEvidence] = useState('');

  function handleSubmit() {
    if (!initiativeId || !date || !value) return;
    const initiative = initiatives.find((i) => i.id === initiativeId);
    onSubmit({
      initiativeId,
      initiativePublicId: initiative?.publicId ?? '',
      measurementDate: date,
      periodLabel,
      benefitType,
      measuredValueUSD: parseFloat(value),
      isEstimate,
      supportingMetric: evidence,
    });
    onClose();
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Log Benefit Measurement" size="md">
      <div className="space-y-4 py-2">
        {/* Initiative select */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Initiative</label>
          <select
            className="w-full rounded border border-gray-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={initiativeId}
            onChange={(e) => setInitiativeId(e.target.value)}
          >
            <option value="">Select initiative...</option>
            {initiatives.map((i) => (
              <option key={i.id} value={i.id}>{i.publicId} — {i.title}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Measurement Date</label>
          <input
            type="date"
            className="w-full rounded border border-gray-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Period label */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Period Label</label>
          <input
            type="text"
            placeholder="e.g. Q1 2026, March 2026"
            className="w-full rounded border border-gray-200 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
          />
        </div>

        {/* Benefit type */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Benefit Type</label>
          <div className="flex flex-wrap gap-2">
            {BENEFIT_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="benefitType"
                  value={t}
                  checked={benefitType === t}
                  onChange={() => setBenefitType(t)}
                  className="accent-blue-600"
                />
                <span className="text-xs text-gray-700">{benefitTypeMeta[t].label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actual vs estimate */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Measurement basis</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={!isEstimate} onChange={() => setIsEstimate(false)} className="accent-blue-600" />
              <span className="text-sm text-gray-700">Actual</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={isEstimate} onChange={() => setIsEstimate(true)} className="accent-blue-600" />
              <span className="text-sm text-gray-700">Estimate</span>
            </label>
          </div>
        </div>

        {/* Value */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Value (USD)</label>
          <input
            type="number"
            min={0}
            placeholder="0"
            className="w-full rounded border border-gray-200 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        {/* Evidence */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Supporting evidence</label>
          <textarea
            rows={3}
            placeholder="Describe how this benefit was measured..."
            className="w-full rounded border border-gray-200 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit}>Log Benefit</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
