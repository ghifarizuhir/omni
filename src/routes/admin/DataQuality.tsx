import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { cn } from '@/src/lib/utils';
import { dataQualityApi, DataQualitySummary } from '@/src/services/adminService';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';

type ModuleKey = keyof DataQualitySummary;

const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'cmdb',            label: 'CMDB' },
  { key: 'event',           label: 'Events' },
  { key: 'incident',        label: 'Incidents' },
  { key: 'change',          label: 'Changes' },
  { key: 'problem',         label: 'Problems' },
  { key: 'service_request', label: 'Service Requests' },
];

// Columns to display per module
const MODULE_COLS: Record<ModuleKey, string[]> = {
  cmdb:            ['publicId', 'name', 'ownerTeamId', 'type', 'environment'],
  event:           ['publicId', 'title', 'severity', 'status', 'firedAt'],
  incident:        ['publicId', 'status', 'priority', 'severity', 'createdAt'],
  change:          ['publicId', 'status', 'riskLevel', 'scheduledStart'],
  problem:         ['publicId', 'status'],
  service_request: ['publicId', 'status'],
};

function fmt(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val;
  return String(val);
}

export const DataQuality: React.FC = () => {
  const { applications } = useCurrentUser();
  const [activeModule, setActiveModule] = useState<ModuleKey>('cmdb');
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAppId, setBulkAppId] = useState('');
  const [rowAppId, setRowAppId] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null); // publicId or 'bulk'

  const loadSummary = useCallback(async () => {
    try {
      const s = await dataQualityApi.summary();
      setSummary(s);
    } catch { /* non-fatal */ }
  }, []);

  const loadRows = useCallback(async (mod: ModuleKey) => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setRowAppId({});
    try {
      const data = await dataQualityApi.list(mod);
      setRows(data as Record<string, unknown>[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadRows(activeModule); }, [activeModule, loadRows]);

  const refresh = () => { loadSummary(); loadRows(activeModule); };

  const handleTabChange = (mod: ModuleKey) => {
    setActiveModule(mod);
    setBulkAppId('');
  };

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) { setSelected(new Set()); }
    else { setSelected(new Set(rows.map(r => String(r.publicId)))); }
  };

  const handleAssign = async (publicId: string) => {
    const appId = rowAppId[publicId];
    if (!appId) return;
    setSaving(publicId);
    try {
      await dataQualityApi.assign(activeModule, publicId, appId);
      refresh();
    } catch (e) {
      alert('Assign failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setSaving(null);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAppId || selected.size === 0) return;
    setSaving('bulk');
    try {
      await dataQualityApi.bulkAssign(activeModule, Array.from(selected), bulkAppId);
      setBulkAppId('');
      refresh();
    } catch (e) {
      alert('Bulk assign failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setSaving(null);
    }
  };

  const cols = MODULE_COLS[activeModule];
  const mod = summary?.[activeModule];

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      {summary && (
        <div className="grid grid-cols-6 gap-3">
          {MODULES.map(m => {
            const s = summary[m.key];
            const isActive = m.key === activeModule;
            return (
              <button
                key={m.key}
                onClick={() => handleTabChange(m.key)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  isActive
                    ? 'border-ois-primary bg-ois-primary/5'
                    : 'border-ois-border bg-white hover:border-ois-primary/40',
                )}
              >
                <p className="text-xs text-ois-text-muted font-medium">{m.label}</p>
                <p className="mt-1 text-lg font-bold text-ois-text">{s.orphan}</p>
                <p className="text-xs text-ois-text-muted">of {s.total} orphan</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Module tabs */}
      <div className="flex flex-wrap gap-1 border-b border-ois-border">
        {MODULES.map(m => (
          <button
            key={m.key}
            onClick={() => handleTabChange(m.key)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeModule === m.key
                ? 'text-ois-primary border-ois-primary'
                : 'text-ois-text-muted border-transparent hover:text-ois-text hover:border-ois-border',
            )}
          >
            {m.label}
            {summary && (
              <Badge variant={summary[m.key].orphan > 0 ? 'danger' : 'success'}>
                {summary[m.key].orphan}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white border border-ois-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-ois-warning" />
            <span className="text-sm font-semibold text-ois-text">
              {mod ? `${mod.orphan} orphan rows` : 'Orphan rows'} — {MODULES.find(m => m.key === activeModule)?.label}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Bulk assign bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-ois-primary/30 bg-ois-primary/5 px-3 py-2">
            <span className="text-xs text-ois-text-muted">{selected.size} selected</span>
            <select
              className="flex-1 h-8 rounded-ois-btn border border-ois-border-strong bg-white px-2 text-sm"
              value={bulkAppId}
              onChange={e => setBulkAppId(e.target.value)}
            >
              <option value="">Pick application…</option>
              {applications.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!bulkAppId || saving === 'bulk'}
              loading={saving === 'bulk'}
              onClick={handleBulkAssign}
            >
              Assign {selected.size} rows
            </Button>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-ois-text-muted py-4 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ois-text-muted py-4 text-center">No orphan rows for this module.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </TH>
                  {cols.map(c => <TH key={c}>{c}</TH>)}
                  <TH className="w-56">Assign Application</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(row => {
                  const pid = String(row.publicId);
                  const appId = rowAppId[pid] ?? '';
                  return (
                    <TR key={pid}>
                      <TD>
                        <input
                          type="checkbox"
                          checked={selected.has(pid)}
                          onChange={() => toggleRow(pid)}
                          className="rounded"
                        />
                      </TD>
                      {cols.map(c => (
                        <TD key={c} className="text-xs max-w-[160px] truncate">
                          {fmt(row[c])}
                        </TD>
                      ))}
                      <TD>
                        <div className="flex gap-1 items-center">
                          <select
                            className="flex-1 h-7 rounded-ois-btn border border-ois-border-strong bg-white px-2 text-xs"
                            value={appId}
                            onChange={e => setRowAppId(prev => ({ ...prev, [pid]: e.target.value }))}
                          >
                            <option value="">Pick…</option>
                            {applications.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={!appId || saving === pid}
                            loading={saving === pid}
                            onClick={() => handleAssign(pid)}
                          >
                            Save
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
