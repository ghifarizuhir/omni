import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { CIAuditEntry } from '../../../types/ci';
import { downloadBlob, toCSV } from '../../../lib/download';

interface ExportAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CIAuditEntry[];
  totalCount: number;
  onExported: (count: number, format: ExportFormat) => void;
}

type ExportFormat = 'csv' | 'json';

const FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Spreadsheet-friendly, opens in Excel / Sheets.' },
  { value: 'json', label: 'JSON', description: 'Structured export with full fields, good for backups.' },
];

export const ExportAuditModal: React.FC<ExportAuditModalProps> = ({
  isOpen, onClose, entries, totalCount, onExported,
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [includeChangeDetails, setIncludeChangeDetails] = useState(true);

  const sourceRows = entries;

  const handleExport = () => {
    const rows = sourceRows.map(e => ({
      timestamp: e.timestamp,
      ciPublicId: e.ciPublicId,
      ciName: e.ciName,
      action: e.action,
      actor: e.actorName,
      actorType: e.actorType,
      source: e.source,
      field: e.field ?? '',
      before: includeChangeDetails ? (e.before ?? '') : '',
      after: includeChangeDetails ? (e.after ?? '') : '',
      description: e.description ?? '',
    }));

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const csv = toCSV(rows, [
        'timestamp', 'ciPublicId', 'ciName', 'action', 'actor', 'actorType',
        'source', 'field', 'before', 'after', 'description',
      ]);
      downloadBlob(csv, `cmdb-audit-${stamp}.csv`, 'text/csv;charset=utf-8');
    } else {
      downloadBlob(JSON.stringify(rows, null, 2), `cmdb-audit-${stamp}.json`, 'application/json');
    }
    onExported(rows.length, format);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export audit log" size="md">
      <div className="space-y-5 py-3">
        <div className="space-y-2">
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Format</label>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                  format === f.value
                    ? 'border-ois-primary bg-ois-primary-pale/40'
                    : 'border-ois-border bg-white hover:bg-ois-bg'
                }`}
              >
                <p className="text-sm font-bold text-ois-text">{f.label}</p>
                <p className="text-xs text-ois-text-muted mt-0.5">{f.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">Scope</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={scope === 'filtered'}
                onChange={() => setScope('filtered')}
                className="text-ois-primary"
              />
              <span className="text-sm text-ois-text">Current view ({entries.length} entries)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer opacity-60">
              <input
                type="radio"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
                disabled
                className="text-ois-primary"
              />
              <span className="text-sm text-ois-text-muted">All entries ({totalCount}) — disabled in mock mode</span>
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeChangeDetails}
            onChange={e => setIncludeChangeDetails(e.target.checked)}
            className="rounded text-ois-primary"
          />
          <span className="text-sm text-ois-text">Include before / after values</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleExport} className="gap-2">
            <Download size={14} />
            Download .{format}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
