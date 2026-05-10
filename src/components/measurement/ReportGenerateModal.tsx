import React, { useState } from 'react';
import { X, Loader2, CheckCircle, Download, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Report, ReportFormat } from '@/src/types/measurement';
import { Button } from '@/src/components/ui/Button';

interface ReportGenerateModalProps {
  report: Report | null;
  onClose: () => void;
  onGenerate: () => void;
}

type ModalState = 'form' | 'loading' | 'success';

const ALL_FORMATS: ReportFormat[] = ['pdf', 'excel', 'csv'];
const FORMAT_LABELS: Record<ReportFormat, string> = { pdf: 'PDF', excel: 'Excel', csv: 'CSV', json: 'JSON' };
const TIME_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last quarter', 'Custom'];

export const ReportGenerateModal: React.FC<ReportGenerateModalProps> = ({ report, onClose, onGenerate }) => {
  const [state, setState] = useState<ModalState>('form');
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [services, setServices] = useState('All services');
  const [formats, setFormats] = useState<ReportFormat[]>(['pdf', 'excel']);

  if (!report) return null;

  const toggleFormat = (fmt: ReportFormat) => {
    setFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt],
    );
  };

  const handleGenerate = () => {
    setState('loading');
    setTimeout(() => {
      setState('success');
      onGenerate();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ois-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-ois-text">Generate Report</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-ois-surface-muted text-ois-text-subtle">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {state === 'form' && (
            <>
              <div>
                <p className="text-sm font-semibold text-ois-text">{report.name}</p>
                <p className="text-xs text-ois-text-subtle font-mono mt-0.5">{report.publicId}</p>
              </div>

              {/* Time range */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Time range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="h-9 rounded-lg border border-ois-border bg-white px-3 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
                >
                  {TIME_RANGES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Services */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Services</label>
                <select
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  className="h-9 rounded-lg border border-ois-border bg-white px-3 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
                >
                  <option>All services</option>
                  <option>Payment Svc</option>
                  <option>Auth Svc</option>
                  <option>Order Svc</option>
                </select>
              </div>

              {/* Format */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Format</label>
                <div className="flex gap-4">
                  {ALL_FORMATS.map((fmt) => (
                    <label key={fmt} className="flex items-center gap-1.5 text-sm text-ois-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formats.includes(fmt)}
                        onChange={() => toggleFormat(fmt)}
                        className="rounded"
                      />
                      {FORMAT_LABELS[fmt]}
                    </label>
                  ))}
                </div>
              </div>

              {/* Deliver to */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">Deliver to</label>
                <div className="flex items-center gap-2 rounded-lg border border-ois-border bg-ois-surface-muted px-3 py-2">
                  <span className="text-sm text-ois-text">Sarah Chen</span>
                  <span className="text-xs text-ois-text-subtle">(your email)</span>
                </div>
                <button className="flex items-center gap-1 text-xs text-ois-primary font-medium hover:underline self-start">
                  <Plus size={12} /> Add recipient
                </button>
              </div>
            </>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 size={32} className="animate-spin text-ois-primary" />
              <p className="text-sm text-ois-text-subtle">Generating report…</p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle size={36} className="text-[#12B76A]" />
              <p className="text-sm font-semibold text-ois-text">Report generated successfully</p>
              <button className="inline-flex items-center gap-1.5 text-sm text-ois-primary font-medium hover:underline">
                <Download size={14} /> Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {state === 'form' && (
          <div className="px-6 py-4 border-t border-ois-border flex justify-end gap-2 bg-ois-surface-muted">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleGenerate} disabled={formats.length === 0}>
              Generate
            </Button>
          </div>
        )}
        {state === 'success' && (
          <div className="px-6 py-4 border-t border-ois-border flex justify-end bg-ois-surface-muted">
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
};
