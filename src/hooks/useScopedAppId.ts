/**
 * useScopedAppId — derive the applicationId to attach to a new artefact.
 *
 * Rules:
 *  - scope === 'all'        → requireApplicationId = true (user must choose)
 *  - scope === { appId }    → auto-fill from scope; requireApplicationId = false
 */
import { useState } from 'react';
import { useScope } from '@/src/lib/scope/ScopeContext';

export type ScopedAppIdSource = 'scope' | 'manual';

export interface UseScopedAppIdResult {
  /** The currently chosen applicationId (null = not yet chosen). */
  value: string | null;
  /** Override the value manually (e.g. from a picker). */
  setValue: (id: string | null) => void;
  /** How the current value was set. */
  source: ScopedAppIdSource;
  /** True when scope === 'all' and the user must pick an application. */
  requireApplicationId: boolean;
  /** Convenience re-export from ScopeContext so callers don't need two imports. */
  writableApps: Array<{ id: string; code: string; name: string }>;
}

export function useScopedAppId(): UseScopedAppIdResult {
  const { scope, writableApps } = useScope();
  const [manual, setManual] = useState<string | null>(null);
  const [source, setSource] = useState<ScopedAppIdSource>('scope');

  const requireApplicationId = scope === 'all';

  // When scoped to a single app and no manual override, auto-fill.
  const scopeAppId = scope !== 'all' ? scope.appId : null;
  const value = source === 'manual' ? manual : scopeAppId;

  const setValue = (id: string | null) => {
    setManual(id);
    setSource('manual');
  };

  return { value, setValue, source, requireApplicationId, writableApps };
}
