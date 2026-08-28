import React, { useState } from 'react';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import {
  CIType, Criticality, Environment, ConfigurationItem, CIAttributes,
} from '../../../types/ci';
import { cmdbService } from '@/src/services/cmdbService';

interface ImportCIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (cis: ConfigurationItem[]) => void;
}

interface ParsedRow {
  name: string;
  publicId?: string;
  type: CIType;
  environment: Environment;
  criticality: Criticality;
  serviceId?: string;
  tags?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim());
    return {
      name: cells[idx('name')] ?? '',
      publicId: idx('publicid') >= 0 ? cells[idx('publicid')] : undefined,
      type: ((cells[idx('type')] ?? 'application') as CIType),
      environment: ((cells[idx('environment')] ?? 'production') as Environment),
      criticality: ((cells[idx('criticality')] ?? 'medium') as Criticality),
      serviceId: idx('serviceid') >= 0 ? cells[idx('serviceid')] || undefined : undefined,
      tags: idx('tags') >= 0 ? cells[idx('tags')] : undefined,
    };
  }).filter(r => r.name);
}

function parseJSON(text: string): ParsedRow[] {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : data.items ?? [];
  return items.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ''),
    publicId: r.publicId ? String(r.publicId) : undefined,
    type: ((r.type as CIType) ?? 'application'),
    environment: ((r.environment as Environment) ?? 'production'),
    criticality: ((r.criticality as Criticality) ?? 'medium'),
    serviceId: r.serviceId ? String(r.serviceId) : undefined,
    tags: Array.isArray(r.tags) ? r.tags.join(',') : (r.tags ? String(r.tags) : undefined),
  })).filter((r: ParsedRow) => r.name);
}

function rowToCI(row: ParsedRow, offset: number): ConfigurationItem {
  const now = new Date().toISOString();
  const ts = Date.now() + offset;
  const attributes: CIAttributes = row.type === 'database'
    ? { kind: 'database', engine: 'postgresql', version: '15', port: 5432, storageGb: 100, replicas: 1, backupSchedule: 'daily 02:00 UTC' }
    : row.type === 'server'
      ? { kind: 'server', os: 'Ubuntu 22.04 LTS', cpuCores: 4, memoryGb: 16, diskGb: 200, ipAddress: '10.0.0.1', hostname: row.name, region: 'us-east-1', provider: 'aws' }
      : { kind: 'application', version: '1.0.0', language: 'Node.js 20', port: 8080, healthCheckPath: '/health', repoUrl: '' };

  return {
    id: `ci-import-${ts}`,
    publicId: row.publicId || `CI-${row.type.slice(0, 3).toUpperCase()}-${ts.toString().slice(-5)}`,
    name: row.name,
    type: row.type,
    status: 'active',
    environment: row.environment,
    criticality: row.criticality,
    ownerTeamId: 'team-current',
    serviceId: row.serviceId || undefined,
    health: 'operational',
    attributes,
    tags: row.tags?.split(/[,;]/).map(t => t.trim()).filter(Boolean) ?? [],
    createdAt: now,
    updatedAt: now,
    openIncidentCount: 0,
    recentChangeCount: 0,
    monitoringRuleCount: 0,
  };
}

export const ImportCIModal: React.FC<ImportCIModalProps> = ({ isOpen, onClose, onImport }) => {
  const [filename, setFilename] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => { setFilename(''); setParsed([]); setError(null); setSaving(false); };

  const handleFile = async (file: File) => {
    setError(null);
    setFilename(file.name);
    try {
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[');
      const rows = isJson ? parseJSON(text) : parseCSV(text);
      if (rows.length === 0) {
        setError('No rows found. CSV must include a `name` column.');
        setParsed([]);
        return;
      }
      setParsed(rows);
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'unknown error'}`);
      setParsed([]);
    }
  };

  const handleImport = async () => {
    setError(null);
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        parsed.map((row) => {
          const tags = row.tags?.split(/[,;]/).map(t => t.trim()).filter(Boolean) ?? [];
          const attributes: Record<string, unknown> =
            row.type === 'database'
              ? { kind: 'database', engine: 'postgresql', version: '15', port: 5432, storageGb: 100, replicas: 1, backupSchedule: 'daily 02:00 UTC' }
              : row.type === 'server'
                ? { kind: 'server', os: 'Ubuntu 22.04 LTS', cpuCores: 4, memoryGb: 16, diskGb: 200, ipAddress: '10.0.0.1', hostname: row.name, region: 'us-east-1', provider: 'aws' }
                : { kind: 'application', version: '1.0.0', language: 'Node.js 20', port: 8080, healthCheckPath: '/health', repoUrl: '' };
          return cmdbService.create({
            name: row.name,
            type: row.type,
            status: 'active',
            environment: row.environment,
            criticality: row.criticality,
            health: 'operational',
            tags,
            attributes,
            serviceId: row.serviceId || undefined,
          });
        })
      );
      const created = results
        .filter((r): r is PromiseFulfilledResult<ConfigurationItem> => r.status === 'fulfilled')
        .map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0 && created.length === 0) {
        const firstErr = (results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined)?.reason;
        setError(firstErr instanceof Error ? firstErr.message : `Failed to import ${failed} CI(s)`);
        return;
      }
      if (failed > 0) {
        setError(`${failed} CI(s) failed to import; ${created.length} succeeded`);
      }
      onImport(created);
      if (created.length > 0) {
        reset();
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Import CIs" size="md">
      <div className="space-y-4 py-3">
        <div className="rounded-lg border border-dashed border-ois-border-strong bg-ois-bg p-6 text-center">
          <Upload size={28} className="mx-auto text-ois-text-subtle mb-3" />
          <p className="text-sm font-bold text-ois-text mb-1">Drop a CSV or JSON file</p>
          <p className="text-xs text-ois-text-muted mb-4">
            Required columns: <code className="font-mono">name</code> · Optional:
            <code className="font-mono"> publicId, type, environment, criticality, serviceId, tags</code>
          </p>
          <label className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-ois-primary text-white px-3 py-1.5 text-sm font-semibold hover:opacity-90">
            <FileText size={14} /> Choose file
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,text/csv,application/json"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          {filename && (
            <p className="text-xs text-ois-text-muted mt-3">
              <span className="font-mono">{filename}</span>
              {parsed.length > 0 && <> · <strong>{parsed.length}</strong> rows ready</>}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {parsed.length > 0 && (
          <div className="rounded-lg border border-ois-border max-h-48 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-ois-bg sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-semibold">Name</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Type</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Env</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Crit.</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-ois-border">
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1 capitalize">{r.type}</td>
                    <td className="px-2 py-1">{r.environment}</td>
                    <td className="px-2 py-1">{r.criticality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 50 && (
              <p className="text-[11px] text-ois-text-muted px-2 py-1 bg-ois-bg">+ {parsed.length - 50} more rows…</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button variant="primary" disabled={parsed.length === 0 || saving} onClick={handleImport}>
            {saving ? 'Importing…' : `Import ${parsed.length > 0 ? `${parsed.length} CI${parsed.length === 1 ? '' : 's'}` : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
