import React, { useEffect, useState, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { permissionRules } from '@/src/lib/rbac';
import { LEVEL_LABEL } from '@/src/types/rbac';
import { adminApi, type PermissionDto } from '@/src/services/adminService';

const ALL = 'all';

export const Permissions: React.FC = () => {
  const [moduleFilter, setModuleFilter] = useState<string>(ALL);
  const [actionFilter, setActionFilter] = useState<string>(ALL);
  const [catalog, setCatalog] = useState<PermissionDto[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listPermissions()
      .then(setCatalog)
      .catch((err: Error) => setCatalogError(err.message));
  }, []);

  const modules = useMemo(
    () => Array.from(new Set(permissionRules.map(r => r.module))).sort(),
    [],
  );
  const actions = useMemo(
    () => Array.from(new Set(permissionRules.map(r => r.action))).sort(),
    [],
  );

  const filtered = permissionRules.filter(r => {
    if (moduleFilter !== ALL && r.module !== moduleFilter) return false;
    if (actionFilter !== ALL && r.action !== actionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* System Permission Catalog — DB-backed (M2) */}
      <div className="bg-white border border-ois-border rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-base font-bold text-ois-text">System Permission Catalog</h2>
          <div className="text-xs text-ois-text-muted">
            DB-backed catalog used by API-level <code>requirePermission()</code> checks.
            {catalog && <> · {catalog.length} permissions</>}
          </div>
        </div>
        {catalogError && (
          <div className="text-xs text-ois-danger mb-2">Failed to load: {catalogError}</div>
        )}
        {!catalog && !catalogError && (
          <div className="text-xs text-ois-text-muted">Loading…</div>
        )}
        {catalog && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {catalog.map(p => (
              <div key={p.key} className="border border-ois-border rounded-md px-3 py-2">
                <div className="font-mono text-xs text-ois-text">{p.key}</div>
                {p.description && (
                  <div className="text-xs text-ois-text-muted mt-0.5">{p.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Existing rich rule matrix (in-code engine) */}
      <div className="bg-white border border-ois-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-ois-text">Permission Rule Matrix</h2>
            <div className="text-xs text-ois-text-muted">
              Read-only — defined in code at <code>src/lib/rbac/permissions.ts</code>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
              className="h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            >
              <option value={ALL}>All modules</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            >
              <option value={ALL}>All actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Module</TH>
              <TH>Action</TH>
              <TH>Variant</TH>
              <TH>Divisions</TH>
              <TH>Min Level</TH>
              <TH>Roles</TH>
              <TH>Scope</TH>
              <TH>Rule</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map(r => (
              <TR key={r.id}>
                <TD><Badge variant="info">{r.module}</Badge></TD>
                <TD className="font-mono text-xs">{r.action}</TD>
                <TD className="font-mono text-xs">{r.variant ?? '—'}</TD>
                <TD className="text-xs">
                  {r.requiredDivisions?.length ? r.requiredDivisions.join(', ') : '—'}
                </TD>
                <TD className="text-xs">
                  {r.requiredLevel ? LEVEL_LABEL[r.requiredLevel] : '—'}
                </TD>
                <TD className="text-xs">
                  {r.requiredFunctionalRoles?.length ? r.requiredFunctionalRoles.join(', ') : '—'}
                </TD>
                <TD><Badge variant="neutral">{r.scope}</Badge></TD>
                <TD className="text-xs text-ois-text-muted">{r.description}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
};
