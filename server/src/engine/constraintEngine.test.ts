import { describe, it, expect } from 'vitest';
import { DeterministicConstraintEngine } from './constraintEngine.js';
import { Technician, ServiceRequest, ProposedAssignment, Assignment } from '../types/index.js';

describe('DeterministicConstraintEngine — 7 Hard Constraints', () => {
  const baseTech: Technician = {
    id: 'tech-01',
    name: 'Carlos Rivera',
    region: 'North',
    skills: ['HVAC', 'Plumbing'],
    shiftStart: '08:00',
    shiftEnd: '17:00',
    maxWorkloadMinutes: 420,
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseReq: ServiceRequest = {
    id: 'SR-101',
    customerName: 'Metro Health Clinic',
    region: 'North',
    requiredSkill: 'HVAC',
    priority: 'HIGH',
    durationMinutes: 90,
    windowStart: '08:30',
    windowEnd: '11:30',
    status: 'UNASSIGNED',
    targetDate: '2026-10-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('RULE 1-7: Validates a 100% compliant assignment without violations', () => {
    const proposed: ProposedAssignment[] = [
      {
        serviceRequestId: 'SR-101',
        technicianId: 'tech-01',
        startTime: '08:30',
        endTime: '10:00',
        durationMinutes: 90,
        reasoning: 'Compliant assignment',
      },
    ];

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([['SR-101', baseReq]]);

    const result = DeterministicConstraintEngine.validateSchedule(proposed, techMap, reqMap);
    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.technicianWorkloadSummary['tech-01'].usedMinutes).toBe(90);
  });

  it('RULE 1: Catches Skill Mismatch (ERR_SKILL_MISMATCH)', () => {
    const electricalReq: ServiceRequest = {
      ...baseReq,
      id: 'SR-102',
      requiredSkill: 'Electrical', // Carlos does NOT have Electrical
    };

    const proposed: ProposedAssignment[] = [
      {
        serviceRequestId: 'SR-102',
        technicianId: 'tech-01',
        startTime: '09:00',
        endTime: '10:30',
        durationMinutes: 90,
        reasoning: 'Invalid skill test',
      },
    ];

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([['SR-102', electricalReq]]);

    const result = DeterministicConstraintEngine.validateSchedule(proposed, techMap, reqMap);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('SKILL');
    expect(result.violations[0].errorCode).toBe('ERR_SKILL_MISMATCH');
  });

  it('RULE 2: Catches Region Mismatch (ERR_REGION_MISMATCH)', () => {
    const southReq: ServiceRequest = {
      ...baseReq,
      id: 'SR-103',
      region: 'South', // Carlos is in North
    };

    const proposed: ProposedAssignment[] = [
      {
        serviceRequestId: 'SR-103',
        technicianId: 'tech-01',
        startTime: '08:30',
        endTime: '10:00',
        durationMinutes: 90,
        reasoning: 'Cross region test',
      },
    ];

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([['SR-103', southReq]]);

    const result = DeterministicConstraintEngine.validateSchedule(proposed, techMap, reqMap);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('REGION');
    expect(result.violations[0].errorCode).toBe('ERR_REGION_MISMATCH');
  });

  it('RULE 3: Catches Assignment Outside Shift Working Hours (ERR_OUTSIDE_SHIFT)', () => {
    // Starts before shift (07:30 < 08:00)
    const proposedEarly: ProposedAssignment = {
      serviceRequestId: 'SR-101',
      technicianId: 'tech-01',
      startTime: '07:30',
      endTime: '09:00',
      durationMinutes: 90,
      reasoning: 'Too early',
    };

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([['SR-101', { ...baseReq, windowStart: '07:00' }]]);

    const result = DeterministicConstraintEngine.validateSchedule([proposedEarly], techMap, reqMap);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('SHIFT');
    expect(result.violations[0].errorCode).toBe('ERR_OUTSIDE_SHIFT');
  });

  it('RULE 3: Catches Unavailable Technician Call-Out (ERR_OUTSIDE_SHIFT)', () => {
    const sickTech: Technician = {
      ...baseTech,
      isAvailable: false,
    };

    const proposed: ProposedAssignment[] = [
      {
        serviceRequestId: 'SR-101',
        technicianId: 'tech-01',
        startTime: '08:30',
        endTime: '10:00',
        durationMinutes: 90,
        reasoning: 'Tech is sick',
      },
    ];

    const techMap = new Map([['tech-01', sickTech]]);
    const reqMap = new Map([['SR-101', baseReq]]);

    const result = DeterministicConstraintEngine.validateSchedule(proposed, techMap, reqMap);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('SHIFT');
    expect(result.violations[0].errorCode).toBe('ERR_OUTSIDE_SHIFT');
  });

  it('RULE 4: Catches Breach of Customer Time Window (ERR_OUTSIDE_WINDOW)', () => {
    // Window is 08:30-11:30. Job finishes at 12:00
    const proposedLate: ProposedAssignment = {
      serviceRequestId: 'SR-101',
      technicianId: 'tech-01',
      startTime: '10:30',
      endTime: '12:00',
      durationMinutes: 90,
      reasoning: 'Breaches customer window',
    };

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([['SR-101', baseReq]]);

    const result = DeterministicConstraintEngine.validateSchedule([proposedLate], techMap, reqMap);
    expect(result.isValid).toBe(false);
    expect(result.violations[0].rule).toBe('WINDOW');
    expect(result.violations[0].errorCode).toBe('ERR_OUTSIDE_WINDOW');
  });

  it('RULE 5: Catches Double-Booking Overlap on Same Technician (ERR_DOUBLE_BOOKING)', () => {
    const req1: ServiceRequest = {
      ...baseReq,
      id: 'SR-101',
      windowStart: '08:00',
      windowEnd: '12:00',
    };
    const req2: ServiceRequest = {
      ...baseReq,
      id: 'SR-102',
      requiredSkill: 'Plumbing',
      windowStart: '08:00',
      windowEnd: '12:00',
    };

    // Task 1: 09:00 - 10:30
    // Task 2: 10:00 - 11:30 (COLLISION between 10:00 and 10:30)
    const proposed: ProposedAssignment[] = [
      {
        serviceRequestId: 'SR-101',
        technicianId: 'tech-01',
        startTime: '09:00',
        endTime: '10:30',
        durationMinutes: 90,
        reasoning: 'Task 1',
      },
      {
        serviceRequestId: 'SR-102',
        technicianId: 'tech-01',
        startTime: '10:00',
        endTime: '11:30',
        durationMinutes: 90,
        reasoning: 'Task 2 overlapping',
      },
    ];

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([
      ['SR-101', req1],
      ['SR-102', req2],
    ]);

    const result = DeterministicConstraintEngine.validateSchedule(proposed, techMap, reqMap);
    expect(result.isValid).toBe(false);
    const overlapViolation = result.violations.find(v => v.errorCode === 'ERR_DOUBLE_BOOKING');
    expect(overlapViolation).toBeDefined();
    expect(overlapViolation?.rule).toBe('OVERLAP');
  });

  it('RULE 5: Permits Adjacent Back-to-Back Assignments (No False Positive Collision)', () => {
    const req1: ServiceRequest = { ...baseReq, id: 'SR-101', windowEnd: '13:00' };
    const req2: ServiceRequest = { ...baseReq, id: 'SR-102', requiredSkill: 'Plumbing', windowEnd: '13:00' };

    // Task 1: 08:30 - 10:00
    // Task 2: 10:00 - 11:30 (Touches 10:00, no overlap)
    const proposed: ProposedAssignment[] = [
      {
        serviceRequestId: 'SR-101',
        technicianId: 'tech-01',
        startTime: '08:30',
        endTime: '10:00',
        durationMinutes: 90,
        reasoning: 'Task 1',
      },
      {
        serviceRequestId: 'SR-102',
        technicianId: 'tech-01',
        startTime: '10:00',
        endTime: '11:30',
        durationMinutes: 90,
        reasoning: 'Task 2',
      },
    ];

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([
      ['SR-101', req1],
      ['SR-102', req2],
    ]);

    const result = DeterministicConstraintEngine.validateSchedule(proposed, techMap, reqMap);
    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('RULE 6: Catches Exceeded Daily Maximum Workload (ERR_EXCEEDS_MAX_WORKLOAD)', () => {
    // Carlos has 420m cap. Three 150m jobs = 450m > 420m
    const reqA: ServiceRequest = { ...baseReq, id: 'SR-A', durationMinutes: 150, windowEnd: '17:00' };
    const reqB: ServiceRequest = { ...baseReq, id: 'SR-B', durationMinutes: 150, windowEnd: '17:00' };
    const reqC: ServiceRequest = { ...baseReq, id: 'SR-C', durationMinutes: 150, windowEnd: '17:00' };

    const proposed: ProposedAssignment[] = [
      { serviceRequestId: 'SR-A', technicianId: 'tech-01', startTime: '08:00', endTime: '10:30', durationMinutes: 150, reasoning: 'A' },
      { serviceRequestId: 'SR-B', technicianId: 'tech-01', startTime: '10:30', endTime: '13:00', durationMinutes: 150, reasoning: 'B' },
      { serviceRequestId: 'SR-C', technicianId: 'tech-01', startTime: '13:00', endTime: '15:30', durationMinutes: 150, reasoning: 'C' },
    ];

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([
      ['SR-A', reqA],
      ['SR-B', reqB],
      ['SR-C', reqC],
    ]);

    const result = DeterministicConstraintEngine.validateSchedule(proposed, techMap, reqMap);
    expect(result.isValid).toBe(false);
    const workloadViolation = result.violations.find(v => v.errorCode === 'ERR_EXCEEDS_MAX_WORKLOAD');
    expect(workloadViolation).toBeDefined();
    expect(workloadViolation?.message).toContain('exceeds daily maximum workload');
  });

  it('RULE 7: Protects Completed Assignments from Being Moved or Reassigned (ERR_COMPLETED_JOB_LOCKED)', () => {
    const lockedAssignment: Assignment = {
      id: 'asgn-prev-1',
      scheduleVersionId: 'ver-1',
      serviceRequestId: 'SR-101',
      technicianId: 'tech-01',
      startTime: '08:30',
      endTime: '10:00',
      durationMinutes: 90,
      status: 'COMPLETED',
      lockState: 'LOCKED_COMPLETED',
      isManualOverride: false,
      assignedBy: 'DISPATCHER',
    };

    // Replan illegally attempts to shift completed job to 11:00
    const illegalReplan: ProposedAssignment[] = [
      {
        serviceRequestId: 'SR-101',
        technicianId: 'tech-01',
        startTime: '11:00',
        endTime: '12:30',
        durationMinutes: 90,
        reasoning: 'Illegal move',
      },
    ];

    const techMap = new Map([['tech-01', baseTech]]);
    const reqMap = new Map([['SR-101', { ...baseReq, status: 'COMPLETED' as const }]]);
    const lockedMap = new Map([['SR-101', lockedAssignment]]);

    const result = DeterministicConstraintEngine.validateSchedule(illegalReplan, techMap, reqMap, lockedMap);
    expect(result.isValid).toBe(false);
    const lockViolation = result.violations.find(v => v.errorCode === 'ERR_COMPLETED_JOB_LOCKED');
    expect(lockViolation).toBeDefined();
    expect(lockViolation?.message).toContain('marked COMPLETED and is permanently locked');
  });
});
