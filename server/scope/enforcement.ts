import { logger } from '../logger';
import { ScopeViolationError } from './errors';

/**
 * After Plan F the scope layer is always-on. The SCOPE_ENFORCEMENT_MODE env
 * var is no longer a knob — anything other than the empty string or "enforce"
 * is logged as a deprecation warning and treated as enforce.
 */
export function readEnforcementMode(): 'enforce' {
  const raw = (process.env.SCOPE_ENFORCEMENT_MODE ?? 'enforce').trim().toLowerCase();
  if (raw && raw !== 'enforce') {
    logger.warn({ requestedMode: raw }, 'SCOPE_ENFORCEMENT_MODE is deprecated; only "enforce" is honored');
  }
  return 'enforce';
}

/**
 * Always throws the violation. Replaces the legacy applyEnforcement which
 * swallowed errors in off/warn modes; routes no longer catch these.
 */
export function assertEnforcement(err: ScopeViolationError): never {
  throw err;
}

/** @deprecated kept for one release for compat — equivalent to assertEnforcement. */
export const applyEnforcement = (err: ScopeViolationError, _res?: unknown): never => assertEnforcement(err);
