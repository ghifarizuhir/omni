const STORAGE_KEY = 'feature.app_scope_ui';

export function readFeatureFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const ls = window.localStorage.getItem(STORAGE_KEY);
  if (ls === 'true') return true;
  if (ls === 'false') return false;
  return import.meta.env.VITE_FEATURE_APP_SCOPE_UI === 'true';
}

export function useScopeUiEnabled(): boolean {
  // No state — the flag is read at module init; flipping it requires a refresh.
  // Acceptable for an internal feature flag; a more dynamic version can subscribe to storage events.
  return readFeatureFlag();
}
