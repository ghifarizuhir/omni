import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { ReportType, ReportFormat } from '@/src/types/measurement';

export interface ContentData {
  name: string;
  description: string;
  type: ReportType;
  timeRange: string;
  services: string[];
  metrics: string[];
  formats: ReportFormat[];
}

interface Step1ContentProps {
  onNext: (data: ContentData) => void;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'monthly_summary',    label: 'Monthly Summary' },
  { value: 'sla_report',         label: 'SLA Report' },
  { value: 'incident_report',    label: 'Incident Report' },
  { value: 'change_report',      label: 'Change Report' },
  { value: 'availability_report', label: 'Availability Report' },
  { value: 'capacity_report',    label: 'Capacity Report' },
  { value: 'custom',             label: 'Custom' },
];

const TIME_RANGES = [
  { value: 'last_7d',      label: 'Last 7 days' },
  { value: 'last_30d',     label: 'Last 30 days' },
  { value: 'last_90d',     label: 'Last 90 days' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'custom',       label: 'Custom range' },
];

const ALL_SERVICES = ['Payment Service', 'Auth Service', 'Order Service', 'Search Service', 'Analytics', 'Inventory', 'Notifications', 'API Gateway'];

const ALL_METRICS = [
  { id: 'availability', label: 'Availability / uptime' },
  { id: 'incident_mttr', label: 'Incident volume and MTTR' },
  { id: 'change_success', label: 'Change success rate' },
  { id: 'capacity', label: 'Capacity utilization' },
  { id: 'service_request', label: 'Service request fulfillment' },
];

const ALL_FORMATS: { value: ReportFormat; label: string }[] = [
  { value: 'pdf',   label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv',   label: 'CSV' },
  { value: 'json',  label: 'JSON' },
];

export const Step1Content: React.FC<Step1ContentProps> = ({ onNext }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ReportType>('monthly_summary');
  const [timeRange, setTimeRange] = useState('last_30d');
  const [services, setServices] = useState<string[]>(['Payment Service', 'Order Service']);
  const [metrics, setMetrics] = useState<string[]>(['availability', 'incident_mttr']);
  const [formats, setFormats] = useState<ReportFormat[]>(['pdf']);
  const [showServicePicker, setShowServicePicker] = useState(false);

  const toggleMetric = (id: string) =>
    setMetrics((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);

  const toggleFormat = (fmt: ReportFormat) =>
    setFormats((prev) => prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]);

  const removeService = (svc: string) =>
    setServices((prev) => prev.filter((s) => s !== svc));

  const addService = (svc: string) => {
    if (!services.includes(svc)) setServices((prev) => [...prev, svc]);
    setShowServicePicker(false);
  };

  const handleNext = () => {
    if (!name.trim()) return;
    onNext({ name, description, type, timeRange, services, metrics, formats });
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Report Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">
          Report Name <span className="text-[#F04438]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Monthly Service Reliability Summary"
          className="h-9 rounded-lg border border-ois-border px-3 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="rounded-lg border border-ois-border px-3 py-2 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 resize-none"
          placeholder="Brief description of this report's purpose"
        />
      </div>

      {/* Report Type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Report Type</label>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_TYPES.map((rt) => (
            <label key={rt.value} className="flex items-center gap-2 text-sm text-ois-text cursor-pointer">
              <input
                type="radio"
                name="reportType"
                value={rt.value}
                checked={type === rt.value}
                onChange={() => setType(rt.value)}
                className="accent-ois-primary"
              />
              {rt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Time Range</label>
        <div className="flex flex-wrap gap-3">
          {TIME_RANGES.map((tr) => (
            <label key={tr.value} className="flex items-center gap-2 text-sm text-ois-text cursor-pointer">
              <input
                type="radio"
                name="timeRange"
                value={tr.value}
                checked={timeRange === tr.value}
                onChange={() => setTimeRange(tr.value)}
                className="accent-ois-primary"
              />
              {tr.label}
            </label>
          ))}
        </div>
      </div>

      {/* Scope — Services */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Scope — Services</label>
        <div className="flex flex-wrap gap-2">
          {services.map((svc) => (
            <span key={svc} className="inline-flex items-center gap-1 rounded-full bg-ois-primary-pale border border-ois-primary/20 px-2.5 py-0.5 text-xs font-medium text-ois-primary">
              {svc}
              <button onClick={() => removeService(svc)} className="hover:text-red-500">
                <X size={10} />
              </button>
            </span>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowServicePicker((o) => !o)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-ois-border px-2.5 py-0.5 text-xs font-medium text-ois-text-subtle hover:border-ois-primary hover:text-ois-primary"
            >
              + Add
            </button>
            {showServicePicker && (
              <div className="absolute left-0 top-7 z-10 w-48 rounded-lg border border-ois-border bg-white shadow-lg py-1">
                {ALL_SERVICES.filter((s) => !services.includes(s)).map((svc) => (
                  <button
                    key={svc}
                    className="w-full text-left px-3 py-1.5 text-xs text-ois-text hover:bg-ois-surface-muted"
                    onClick={() => addService(svc)}
                  >
                    {svc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Include Metrics */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Include Metrics</label>
        <div className="flex flex-col gap-2">
          {ALL_METRICS.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm text-ois-text cursor-pointer">
              <input
                type="checkbox"
                checked={metrics.includes(m.id)}
                onChange={() => toggleMetric(m.id)}
                className="rounded accent-ois-primary"
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Format</label>
        <div className="flex gap-4">
          {ALL_FORMATS.map((f) => (
            <label key={f.value} className="flex items-center gap-2 text-sm text-ois-text cursor-pointer">
              <input
                type="checkbox"
                checked={formats.includes(f.value)}
                onChange={() => toggleFormat(f.value)}
                className="rounded accent-ois-primary"
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-2 border-t border-ois-border">
        <Button variant="primary" size="sm" onClick={handleNext} disabled={!name.trim()}>
          Next: Schedule →
        </Button>
      </div>
    </div>
  );
};
