import React, { useState, useMemo } from 'react';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { permissionRules } from '@/src/lib/rbac';
import { LEVEL_LABEL } from '@/src/types/rbac';

const ALL = 'all';

export const Permissions: React.FC = () => {
  const [moduleFilter, setModuleFilter] = useState<string>(ALL);
  const [actionFilter, setActionFilter] = useState<string>(ALL);

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
    <div className="bg-white border border-ois-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-ois-text">Permission Matrix</h2>
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
  );
};
