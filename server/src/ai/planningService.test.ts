import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningService } from './planningService.js';
import { DispatchStore } from '../data/store.js';

describe('PlanningService & Heuristic Planner', () => {
  beforeEach(() => {
    DispatchStore.getInstance().resetToSeed();
  });

  it('generates a 100% compliant baseline proposal passing all 7 hard constraints', async () => {
    const result = await PlanningService.generatePlan('INITIAL_PLAN');

    expect(result.validation.isValid).toBe(true);
    expect(result.validation.violations).toHaveLength(0);
    expect(result.plan.assignments.length).toBeGreaterThanOrEqual(9);
    expect(result.plan.tradeOffs.length).toBeGreaterThan(0);
    expect(result.plan.suggestedQuestions.length).toBeGreaterThan(0);
  });

  it('intelligently identifies SR-110 as unassigned due to capacity bottleneck', async () => {
    const result = await PlanningService.generatePlan('INITIAL_PLAN');

    const unassigned110 = result.plan.unassignedRequests.find(u => u.serviceRequestId === 'SR-110');
    expect(unassigned110).toBeDefined();
    expect(unassigned110?.reason).toContain('Capacity exhausted');
  });

  it('preserves completed assignments verbatim when replanning after emergency', async () => {
    const store = DispatchStore.getInstance();

    // 1. Generate & commit version 1
    const baseline = await PlanningService.generatePlan('INITIAL_PLAN');
    const { assignments } = store.commitVersion(
      {
        triggerReason: 'INITIAL_PLAN',
        summary: baseline.plan.planSummary,
        tradeOffs: baseline.plan.tradeOffs,
        risks: baseline.plan.risks,
        unassignedNotes: baseline.plan.unassignedRequests,
        suggestedQuestions: baseline.plan.suggestedQuestions,
      },
      baseline.plan.assignments
    );

    // 2. Mark SR-101 as COMPLETED
    const sr101Asgn = assignments.find(a => a.serviceRequestId === 'SR-101')!;
    sr101Asgn.status = 'COMPLETED';
    sr101Asgn.lockState = 'LOCKED_COMPLETED';
    store.updateRequest('SR-101', { status: 'COMPLETED' });

    // 3. Ingest Emergency Request
    store.addEmergencyRequest();

    // 4. Replan
    const replanResult = await PlanningService.generatePlan('EMERGENCY_REPLAN');
    expect(replanResult.validation.isValid).toBe(true);

    // Assert SR-101 kept exact same technician and start time
    const sr101Replanned = replanResult.plan.assignments.find(a => a.serviceRequestId === 'SR-101')!;
    expect(sr101Replanned.technicianId).toBe(sr101Asgn.technicianId);
    expect(sr101Replanned.startTime).toBe(sr101Asgn.startTime);
    expect(sr101Replanned.isLocked).toBe(true);

    // Assert Emergency request was scheduled
    const emergencyAssigned = replanResult.plan.assignments.find(a => a.serviceRequestId === 'SR-111');
    expect(emergencyAssigned).toBeDefined();
  });
});
