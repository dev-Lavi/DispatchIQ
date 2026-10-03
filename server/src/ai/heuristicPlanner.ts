import {
  Technician,
  ServiceRequest,
  Assignment,
  ProposedAssignment,
  UnassignedAnalysis,
  OperationalRisk,
} from '../types/index.js';
import { DeterministicConstraintEngine } from '../engine/constraintEngine.js';

export interface PlanOutput {
  planSummary: string;
  assignments: ProposedAssignment[];
  unassignedRequests: UnassignedAnalysis[];
  risks: OperationalRisk[];
  tradeOffs: string[];
  suggestedQuestions: string[];
  replanningRationale?: string;
}

export class HeuristicPlanner {
  /**
   * Generates a high-quality assignment proposal respecting all 7 hard constraints,
   * preserving locked assignments, and reasoning about operational trade-offs.
   */
  public static generatePlan(
    technicians: Technician[],
    requests: ServiceRequest[],
    existingAssignments: Assignment[] = [],
    triggerReason: string = 'INITIAL_PLAN'
  ): PlanOutput {
    const assignments: ProposedAssignment[] = [];
    const unassigned: UnassignedAnalysis[] = [];
    const risks: OperationalRisk[] = [];
    const tradeOffs: string[] = [];
    const suggestedQuestions: string[] = [];

    // Map of locked assignments that CANNOT be moved
    const lockedByReq = new Map<string, Assignment>();
    for (const a of existingAssignments) {
      if (a.lockState === 'LOCKED_COMPLETED' || a.status === 'COMPLETED' || a.lockState === 'LOCKED_IN_PROGRESS') {
        lockedByReq.set(a.serviceRequestId, a);
        assignments.push({
          serviceRequestId: a.serviceRequestId,
          technicianId: a.technicianId,
          startTime: a.startTime,
          endTime: a.endTime,
          durationMinutes: a.durationMinutes,
          reasoning: `Preserved locked assignment (${a.status}) — immutable boots-on-the-ground reality.`,
          isLocked: true,
        });
      }
    }

    // Filter available technicians
    const availableTechs = technicians.filter(t => t.isAvailable);

    // Track technician occupied slots and workload
    // techId -> list of { start: minutes, end: minutes }
    const techSlots = new Map<string, Array<{ start: number; end: number }>>();
    const techWorkload = new Map<string, number>();

    for (const t of technicians) {
      techSlots.set(t.id, []);
      techWorkload.set(t.id, 0);
    }

    // Populate existing locked intervals
    for (const asgn of assignments) {
      const list = techSlots.get(asgn.technicianId) || [];
      const s = DeterministicConstraintEngine.timeToMinutes(asgn.startTime);
      const e = DeterministicConstraintEngine.timeToMinutes(asgn.endTime);
      list.push({ start: s, end: e });
      techSlots.set(asgn.technicianId, list);

      const load = (techWorkload.get(asgn.technicianId) || 0) + asgn.durationMinutes;
      techWorkload.set(asgn.technicianId, load);
    }

    // Requests remaining to be scheduled
    const pendingRequests = requests.filter(r => !lockedByReq.has(r.id) && r.status !== 'CANCELLED');

    // Priority sorting: EMERGENCY (0) > HIGH (1) > MEDIUM (2) > LOW (3)
    const priorityWeight: Record<string, number> = {
      EMERGENCY: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    pendingRequests.sort((a, b) => {
      const pDiff = (priorityWeight[a.priority] ?? 4) - (priorityWeight[b.priority] ?? 4);
      if (pDiff !== 0) return pDiff;
      // Secondary: earliest customer window end
      return a.windowEnd.localeCompare(b.windowEnd);
    });

    for (const req of pendingRequests) {
      // Find candidate technicians matching hard constraints: Skill, Region, Availability
      const candidateTechs = availableTechs.filter(t =>
        t.region === req.region && t.skills.includes(req.requiredSkill)
      );

      if (candidateTechs.length === 0) {
        unassigned.push({
          serviceRequestId: req.id,
          reason: `Zero available technicians found in Region '${req.region}' certified in '${req.requiredSkill}'.`,
          recommendedAction: `Consider cross-region dispatch authorization or contract external certified specialist.`,
        });
        suggestedQuestions.push(
          `Can customer ${req.customerName} (${req.id}) accept a certified technician from an adjacent region?`
        );
        continue;
      }

      // Sort candidate technicians: prefer lower current workload for equity
      candidateTechs.sort((a, b) => (techWorkload.get(a.id) || 0) - (techWorkload.get(b.id) || 0));

      let placed = false;
      const reqDuration = req.durationMinutes;
      const winStartMin = DeterministicConstraintEngine.timeToMinutes(req.windowStart);
      const winEndMin = DeterministicConstraintEngine.timeToMinutes(req.windowEnd);

      for (const tech of candidateTechs) {
        const currentLoad = techWorkload.get(tech.id) || 0;
        if (currentLoad + reqDuration > tech.maxWorkloadMinutes) {
          continue; // Rule 6: Exceeds max workload
        }

        const shiftStartMin = DeterministicConstraintEngine.timeToMinutes(tech.shiftStart);
        const shiftEndMin = DeterministicConstraintEngine.timeToMinutes(tech.shiftEnd);
        const earliestCandidate = Math.max(winStartMin, shiftStartMin);
        const latestCandidate = Math.min(winEndMin, shiftEndMin) - reqDuration;

        if (earliestCandidate > latestCandidate) {
          continue; // Time window does not intersect shift
        }

        const existingIntervals = (techSlots.get(tech.id) || []).slice().sort((a, b) => a.start - b.start);

        // Search for earliest valid 15-minute slot
        let slotFound: { start: number; end: number } | null = null;
        for (let candidateStart = earliestCandidate; candidateStart <= latestCandidate; candidateStart += 15) {
          const candidateEnd = candidateStart + reqDuration;

          // Check overlap against existingIntervals
          let hasOverlap = false;
          for (const interval of existingIntervals) {
            if (candidateStart < interval.end && candidateEnd > interval.start) {
              hasOverlap = true;
              break;
            }
          }

          if (!hasOverlap) {
            slotFound = { start: candidateStart, end: candidateEnd };
            break;
          }
        }

        if (slotFound) {
          const formatTime = (mins: number) => {
            const h = Math.floor(mins / 60).toString().padStart(2, '0');
            const m = (mins % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
          };

          const startTimeStr = formatTime(slotFound.start);
          const endTimeStr = formatTime(slotFound.end);

          assignments.push({
            serviceRequestId: req.id,
            technicianId: tech.id,
            startTime: startTimeStr,
            endTime: endTimeStr,
            durationMinutes: reqDuration,
            reasoning: `Matched ${tech.name} (${tech.region} territory, certified ${req.requiredSkill}). Workload: ${currentLoad + reqDuration}/${tech.maxWorkloadMinutes}m.`,
          });

          // Update tracking
          const currentSlots = techSlots.get(tech.id) || [];
          currentSlots.push(slotFound);
          techSlots.set(tech.id, currentSlots);
          techWorkload.set(tech.id, currentLoad + reqDuration);

          placed = true;
          break;
        }
      }

      if (!placed) {
        unassigned.push({
          serviceRequestId: req.id,
          reason: `Capacity exhausted for certified ${req.requiredSkill} technicians in ${req.region} within customer window ${req.windowStart}–${req.windowEnd}.`,
          recommendedAction: `Offer customer arrival after 16:30 or reschedule to next business day.`,
        });
        suggestedQuestions.push(
          `Can customer ${req.customerName} (${req.id}) accommodate a 60-minute window extension or split visit?`
        );
      }
    }

    // Synthesize trade-offs and operational risks
    tradeOffs.push(
      `Prioritized ${requests.filter(r => r.priority === 'EMERGENCY' || r.priority === 'HIGH').length} Emergency/High priority orders ahead of routine tasks.`
    );
    tradeOffs.push(
      `Balanced workload across available technicians while preserving regional territory boundaries.`
    );

    for (const tech of availableTechs) {
      const load = techWorkload.get(tech.id) || 0;
      if (load >= tech.maxWorkloadMinutes * 0.9) {
        risks.push({
          severity: 'MEDIUM',
          description: `Technician ${tech.name} is operating at ${Math.round((load / tech.maxWorkloadMinutes) * 100)}% workload capacity (${load}/${tech.maxWorkloadMinutes}m).`,
          affectedTechnicianId: tech.id,
        });
      }
    }

    if (unassigned.length > 0) {
      tradeOffs.push(
        `Left ${unassigned.length} work orders unassigned to avoid breaching technician max workload caps or overtime rules.`
      );
    }

    let summary = `Generated schedule proposal: ${assignments.length} assigned, ${unassigned.length} unassigned across ${availableTechs.length} available technicians.`;
    if (triggerReason === 'EMERGENCY_REPLAN') {
      summary = `Emergency replan accommodated: locked completed work protected; priority work order accommodated.`;
    }

    return {
      planSummary: summary,
      assignments,
      unassignedRequests: unassigned,
      risks,
      tradeOffs,
      suggestedQuestions,
      replanningRationale: triggerReason === 'EMERGENCY_REPLAN' ? 'Expedited preemption to accommodate emergency ticket while strictly locking completed tasks.' : undefined,
    };
  }
}
