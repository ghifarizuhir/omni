import type { Response } from 'express';
import { logger } from '../logger';
import { ScopeViolationError } from './errors';

export type EnforcementMode = 'off' | 'warn' | 'enforce';

const VALID: readonly EnforcementMode[] = ['off', 'warn', 'enforce'];

export function readEnforcementMode(): EnforcementMode {
  const raw = (process.env.SCOPE_ENFORCEMENT_MODE ?? 'off').trim().toLowerCase();
  return (VALID as readonly string[]).includes(raw) ? (raw as EnforcementMode) : 'off';
}

/**
 * Apply the configured enforcement mode to a scope violation.
 * - off: log at debug, do nothing.
 * - warn: log at warn, set X-Scope-Warning header.
 * - enforce: throw.
 */
export function applyEnforcement(err: ScopeViolationError, res: Response): void {
  const mode = readEnforcementMode();
  if (mode === 'enforce') throw err;
  if (mode === 'warn') {
    logger.warn({ violation: err.toJSON() }, 'scope warn');
    res.setHeader('X-Scope-Warning', `${err.module}.${err.action}${err.applicationId ? `:${err.applicationId}` : ''}`);
    return;
  }
  logger.debug({ violation: err.toJSON() }, 'scope off');
}
