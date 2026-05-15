import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../db';
import {
  listDivisions, listDepartments, listTeams,
  listApplications, listFunctionalRoles, listRbacUsers,
  upsertDivision, deleteDivision,
  upsertDepartment, upsertTeam,
  upsertApplication,
  upsertRbacUser,
} from '../repositories/rbacOrg';

const TENANT = 'tenant-demo';

describe('rbacOrg repository (against seeded dev DB)', () => {
  beforeAll(async () => {
    // Ensure seed has run; tests assume the canonical seeded fixture.
    const divs = await prisma.division.count({ where: { tenantId: TENANT } });
    if (divs === 0) {
      throw new Error('Seed missing. Run `npm run db:seed` before tests.');
    }
  });

  it('lists the seeded org tree at expected sizes', async () => {
    expect((await listDivisions(TENANT)).length).toBe(4);
    expect((await listDepartments(TENANT)).length).toBe(8);
    expect((await listTeams(TENANT)).length).toBe(13);
    expect((await listApplications(TENANT)).length).toBe(6);
    expect((await listFunctionalRoles(TENANT)).length).toBe(7);
    expect((await listRbacUsers(TENANT)).length).toBe(11);
  });

  it('marks admin@omni.local as superadmin', async () => {
    const users = await listRbacUsers(TENANT);
    const admin = users.find(u => u.email === 'admin@omni.local');
    expect(admin?.isSuperadmin).toBe(true);
  });

  it('round-trips a Division upsert/delete', async () => {
    await upsertDivision(TENANT, 'div-x', { code: 'X', name: 'X Division' });
    const after = await listDivisions(TENANT);
    expect(after.find(d => d.id === 'div-x')?.name).toBe('X Division');

    await upsertDivision(TENANT, 'div-x', { code: 'X', name: 'X Renamed' });
    const renamed = await listDivisions(TENANT);
    expect(renamed.find(d => d.id === 'div-x')?.name).toBe('X Renamed');

    await deleteDivision('div-x');
    const removed = await listDivisions(TENANT);
    expect(removed.find(d => d.id === 'div-x')).toBeUndefined();
  });

  it('rejects a Department whose divisionId does not exist', async () => {
    await expect(
      upsertDepartment(TENANT, 'dept-bad', { divisionId: 'div-nope', code: 'BAD', name: 'Bad' })
    ).rejects.toThrow(/Unknown divisionId/);
  });

  it('rejects a Team whose departmentId does not exist', async () => {
    await expect(
      upsertTeam(TENANT, 'team-bad', { departmentId: 'dept-nope', code: 'BAD', name: 'Bad' })
    ).rejects.toThrow(/Unknown departmentId/);
  });

  it('replaces application team links on upsert', async () => {
    await upsertApplication(TENANT, 'app-loan', {
      code: 'LOAN',
      name: 'Loan Origination System',
      teams: ['team-core-loan', 'team-core-deposit'],
    });
    const apps = await listApplications(TENANT);
    const loan = apps.find(a => a.id === 'app-loan');
    expect(loan?.teams.sort()).toEqual(['team-core-deposit', 'team-core-loan']);

    // restore single-team mapping
    await upsertApplication(TENANT, 'app-loan', {
      code: 'LOAN',
      name: 'Loan Origination System',
      teams: ['team-core-loan'],
    });
  });

  it('upserts a synthetic-only user merged by email', async () => {
    await upsertRbacUser(TENANT, 'u-test-merge', {
      email: 'admin@omni.local',
      name: 'Super Admin',
      isSuperadmin: true,
      functionalRoles: [],
    });
    const admin = await prisma.user.findUnique({ where: { email: 'admin@omni.local' } });
    expect(admin?.isSuperadmin).toBe(true);
  });
});
