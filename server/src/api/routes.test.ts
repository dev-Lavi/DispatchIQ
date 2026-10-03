import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { DispatchStore } from '../data/store.js';

describe('REST API Endpoints Integration Test', () => {
  beforeEach(() => {
    DispatchStore.getInstance().resetToSeed();
  });

  it('GET /api/state returns initial baseline scenario state', async () => {
    const res = await request(app).get('/api/state');
    expect(res.status).toBe(200);
    expect(res.body.technicians).toHaveLength(4);
    expect(res.body.requests).toHaveLength(10);
    expect(res.body.schedule.status).toBe('DRAFT');
    expect(res.body.currentAssignments).toHaveLength(0);
  });

  it('Flow: Generate Plan -> Review -> Approve Version 1', async () => {
    // 1. Generate plan
    const genRes = await request(app).post('/api/schedules/generate').send();
    expect(genRes.status).toBe(200);
    expect(genRes.body.validation.isValid).toBe(true);
    expect(genRes.body.plan.assignments.length).toBeGreaterThanOrEqual(9);

    // 2. Approve plan
    const appRes = await request(app).post('/api/schedules/approve').send();
    expect(appRes.status).toBe(200);
    expect(appRes.body.success).toBe(true);
    expect(appRes.body.version.versionNumber).toBe(1);
    expect(appRes.body.assignments.length).toBeGreaterThanOrEqual(9);

    // 3. Verify state is now active with version 1
    const stateRes = await request(app).get('/api/state');
    expect(stateRes.body.schedule.status).toBe('ACTIVE');
    expect(stateRes.body.currentVersion.versionNumber).toBe(1);
    expect(stateRes.body.notifications.length).toBeGreaterThan(0);
  });

  it('Disruption Flow: Ingest Emergency -> Replan -> Diff -> Approve Version 2', async () => {
    // 1. Setup Version 1
    await request(app).post('/api/schedules/generate').send();
    await request(app).post('/api/schedules/approve').send();

    // 2. Mark SR-101 as completed
    await request(app).patch('/api/requests/SR-101').send({ status: 'COMPLETED' });

    // 3. Ingest Emergency Work Order SR-111
    const emergRes = await request(app).post('/api/emergency').send();
    expect(emergRes.status).toBe(200);
    expect(emergRes.body.emergencyRequest.id).toBe('SR-111');

    // 4. Trigger Replan
    const replanRes = await request(app).post('/api/schedules/replan').send({
      triggerReason: 'EMERGENCY_REPLAN',
      emergencyRequestId: 'SR-111',
    });
    expect(replanRes.status).toBe(200);
    expect(replanRes.body.validation.isValid).toBe(true);
    expect(replanRes.body.diff.newlyAssigned).toContain('SR-111');

    // Locked completed job SR-101 must be preserved in unchanged list
    expect(replanRes.body.diff.unchanged).toContain('SR-101');

    // 5. Approve Version 2
    const app2Res = await request(app).post('/api/schedules/approve').send();
    expect(app2Res.status).toBe(200);
    expect(app2Res.body.version.versionNumber).toBe(2);

    // 6. Verify audit logs
    const auditRes = await request(app).get('/api/audit-logs');
    expect(auditRes.body.length).toBeGreaterThanOrEqual(4);
  });
});
