import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CapacityMetric, CapacityThreshold, CapacityThresholdSeverity } from '../../types';
import { cn } from '../../lib/utils';

interface NewThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: CapacityMetric[];
  onCreated?: (threshold: CapacityThreshold) => void;
}

export function NewThresholdModal({ isOpen, onClose, metrics, onCreated }: NewThresholdModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [metricId, setMetricId] = useState('');
  const [severity, setSeverity] = useState<CapacityThresholdSeverity>('warning');
  const [thresholdValue, setThresholdValue] = useState('70');
  const [duration, setDuration] = useState('5');
  const [alertRoute, setAlertRoute] = useState('ROUTE-CRITICAL-PROD');
  const [autoScaling, setAutoScaling] = useState(false);
  const [scalingPolicy, setScalingPolicy] = useState('');
  const [autoRule, setAutoRule] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setMetricId('');
    setSeverity('warning');
    setThresholdValue('70');
    setDuration('5');
    setAlertRoute('ROUTE-CRITICAL-PROD');
    setAutoScaling(false);
    setScalingPolicy('');
    setAutoRule(false);
  };

  const handleCreate = () => {
    const metric = metrics.find(m => m.id === metricId);
    const now = new Date().toISOString();
    const id = `thr-${Date.now()}`;
    const threshold: CapacityThreshold = {
      id,
      publicId: `THR-${Date.now().toString().slice(-6)}`,
      name,
      description: description || undefined,
      metricId: metricId || (metrics[0]?.id ?? ''),
      metricPublicId: metric?.publicId ?? metrics[0]?.publicId ?? '',
      metricName: metric?.name ?? metrics[0]?.name ?? '',
      severity,
      operator: '>',
      thresholdValue: Number(thresholdValue) || 0,
      durationMinutes: Number(duration) || 0,
      alertChannel: alertRoute,
      autoScalingEnabled: autoScaling,
      autoScalingPolicy: autoScaling ? scalingPolicy || undefined : undefined,
      enabled: true,
      triggerCount30d: 0,
      linkedRuleIds: [],
      ownerId: 'user-current',
      ownerName: 'You',
      createdAt: now,
      updatedAt: now,
    };
    onCreated?.(threshold);
    resetForm();
    onClose();
  };

  const severityOptions: { value: CapacityThresholdSeverity; label: string }[] = [
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Threshold" size="md">
      <div className="space-y-6 py-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Payment CPU high warning"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Description</label>
          <Input
            placeholder="Optional description"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <SectionLabel>WHAT TO MONITOR</SectionLabel>

        {/* Metric select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Select metric</label>
          <select
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={metricId}
            onChange={e => setMetricId(e.target.value)}
          >
            <option value="">— select a metric —</option>
            {metrics.map(m => (
              <option key={m.id} value={m.id}>
                {m.publicId} — {m.name}
              </option>
            ))}
          </select>
        </div>

        <SectionLabel>WHEN TO TRIGGER</SectionLabel>

        {/* Severity radio */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Severity</label>
          <div className="flex items-center gap-4">
            {severityOptions.map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="severity"
                  value={opt.value}
                  checked={severity === opt.value}
                  onChange={() => setSeverity(opt.value)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Condition row */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Condition</label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">value</span>
            <span className="rounded-md border border-gray-300 px-2 py-1 text-gray-700 font-mono bg-gray-50">{'>'}</span>
            <input
              type="number"
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
              value={thresholdValue}
              onChange={e => setThresholdValue(e.target.value)}
            />
            <span className="text-gray-600">%</span>
            <span className="text-gray-500">for at least</span>
            <input
              type="number"
              className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
            <span className="text-gray-600">minutes</span>
          </div>
        </div>

        <SectionLabel>WHAT TO DO</SectionLabel>

        {/* Alert route */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Alert route</label>
          <Input
            value={alertRoute}
            onChange={e => setAlertRoute(e.target.value)}
          />
        </div>

        {/* Auto-scaling */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScaling}
              onChange={e => setAutoScaling(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">Auto-scaling enabled</span>
          </label>
          {autoScaling && (
            <div className="ml-6 space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Policy</label>
              <Input
                placeholder="e.g. scale-up-2-replicas"
                value={scalingPolicy}
                onChange={e => setScalingPolicy(e.target.value)}
              />
            </div>
          )}
        </div>

        <SectionLabel>LINK TO MONITORING</SectionLabel>

        {/* Auto-create rule */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRule}
            onChange={e => setAutoRule(e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm text-gray-700">Auto-create monitoring rule</span>
        </label>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="default" onClick={handleCreate} disabled={!name}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-start">
        <span className="bg-white pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {children}
        </span>
      </div>
    </div>
  );
}
