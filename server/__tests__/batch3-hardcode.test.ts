import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('hardcode sweep', () => {
  it('IncidentQueue: no hardcoded u-001 in applyQuickFilter', () => {
    const s = readFileSync('src/routes/incidents/IncidentQueue.tsx', 'utf8');
    expect(s).not.toContain("i.assigneeId === 'u-001'");
  });

  it('RCAWorkspace: no Sarah Chen or hardcoded authorId', () => {
    const s = readFileSync('src/routes/problems/RCAWorkspace.tsx', 'utf8');
    expect(s).not.toContain('Sarah Chen');
    expect(s).not.toContain("authorId: 'u-001'");
  });

  it('RequestQueue: no static NOW = Date.now() at module level', () => {
    const s = readFileSync('src/routes/requests/RequestQueue.tsx', 'utf8');
    expect(s).not.toMatch(/^const NOW = Date\.now\(\);/m);
    expect(s).toContain('useState(Date.now())');
  });

  it('ImprovementDetail: no hardcoded Sarah Chen author', () => {
    const s = readFileSync('src/routes/improvement/ImprovementDetail.tsx', 'utf8');
    expect(s).not.toContain("authorName: 'Sarah Chen'");
  });

  it('ImprovementRegister: no hardcoded LOGGED_IN_USER constant', () => {
    const s = readFileSync('src/routes/improvement/ImprovementRegister.tsx', 'utf8');
    expect(s).not.toContain("const LOGGED_IN_USER = 'u-001'");
    expect(s).toContain('LOGGED_IN_USER_FALLBACK');
  });

  it('EventDetail: no hardcoded Sarah Chen comment user', () => {
    const s = readFileSync('src/routes/monitoring/EventDetail.tsx', 'utf8');
    expect(s).not.toContain("user: 'Sarah Chen'");
  });

  it('SignOffQueue: no hardcoded CURRENT_USER_ID constant', () => {
    const s = readFileSync('src/routes/testing/SignOffQueue.tsx', 'utf8');
    expect(s).not.toContain("const CURRENT_USER_ID = 'u-001'");
    expect(s).toContain('CURRENT_USER_FALLBACK');
  });
});
