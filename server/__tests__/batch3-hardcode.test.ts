import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('hardcode sweep', () => {
  it('IncidentQueue no hardcoded u-001 in applyQuickFilter', () => {
    const s = readFileSync('src/routes/incidents/IncidentQueue.tsx', 'utf8');
    expect(s).not.toContain("i.assigneeId === 'u-001'");
  });
  it('RCAWorkspace no Sarah Chen', () => {
    const s = readFileSync('src/routes/problems/RCAWorkspace.tsx', 'utf8');
    expect(s).not.toContain('Sarah Chen');
    expect(s).not.toContain("authorId: 'u-001'");
  });
});
