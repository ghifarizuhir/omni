import React from 'react';
import { X, Download, FileText, FileSpreadsheet, Plus } from 'lucide-react';
import { Report, ReportFormat } from '@/src/types/measurement';
import { Button } from '@/src/components/ui/Button';

interface ReportVersionsDrawerProps {
  report: Report | null;
  onClose: () => void;
}

const formatIcon: Record<ReportFormat, React.ReactNode> = {
  pdf:   <FileText size={14} className="text-red-500" />,
  excel: <FileSpreadsheet size={14} className="text-green-600" />,
  csv:   <FileText size={14} className="text-blue-500" />,
  json:  <FileText size={14} className="text-yellow-500" />,
};

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

export const ReportVersionsDrawer: React.FC<ReportVersionsDrawerProps> = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col bg-white shadow-2xl border-l border-ois-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ois-border">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ois-text leading-tight truncate">{report.name}</h3>
            <p className="text-xs font-mono text-ois-text-subtle mt-0.5">{report.publicId}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-ois-surface-muted text-ois-text-subtle"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h4 className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider mb-3">
            Version History ({report.availableVersions.length})
          </h4>

          {report.availableVersions.length === 0 ? (
            <p className="text-sm text-ois-text-subtle">No versions generated yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {report.availableVersions.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-ois-border bg-ois-surface-muted px-4 py-3 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {formatIcon[v.format]}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ois-text">{formatDate(v.generatedAt)}</p>
                      <p className="text-[11px] text-ois-text-subtle">{v.format.toUpperCase()} · {formatSize(v.sizeKB)}</p>
                    </div>
                  </div>
                  <a
                    href={v.downloadUrl}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-ois-btn bg-ois-surface-muted text-ois-text hover:bg-ois-border border border-ois-border transition-colors"
                  >
                    <Download size={12} />
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ois-border">
          <Button variant="primary" size="sm" className="w-full">
            <Plus size={14} className="mr-1" />
            Generate new version
          </Button>
        </div>
      </div>
    </>
  );
};
