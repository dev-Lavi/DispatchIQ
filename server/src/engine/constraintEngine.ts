import {
  Technician,
  ServiceRequest,
  ProposedAssignment,
  ScheduleValidationResult,
  ValidationViolation,
  Assignment,
} from '../types/index.js';

export class DeterministicConstraintEngine {
  /**
   * Helper to convert "HH:mm" to minutes since midnight for strict time math
   */
  public static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validates a single proposed assignment in isolation (e.g. for pre-flight manual override checks)
   */
  public static validateSingleAssignment(
    assignment: ProposedAssignment,
    technician: Technician,
    request: ServiceRequest,
    lockedAssignment?: Assignment
  ): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Rule 1: Skill Check
    if (!technician.skills.includes(request.requiredSkill)) {
      violations.push({
        rule: 'SKILL',
        errorCode: 'ERR_SKILL_MISMATCH',
        technicianId: technician.id,
        serviceRequestId: request.id,
        message: `Technician ${technician.name} lacks required skill '${request.requiredSkill}' (Certified: ${technician.skills.join(', ')})`,
      });
    }

    // Rule 2: Region Match
    if (technician.region !== request.region) {
      violations.push({
        rule: 'REGION',
        errorCode: 'ERR_REGION_MISMATCH',
        technicianId: technician.id,
        serviceRequestId: request.id,
        message: `Technician ${technician.name} is in region '${technician.region}', but work order is in '${request.region}'`,
      });
    }

    // Rule 3: Shift Availability & Technician Status
    const asgnStart = this.timeToMinutes(assignment.startTime);
    const asgnEnd = this.timeToMinutes(assignment.endTime);
    const shiftStart = this.timeToMinutes(technician.shiftStart);
    const shiftEnd = this.timeToMinutes(technician.shiftEnd);

    if (!technician.isAvailable) {
      violations.push({
        rule: 'SHIFT',
        errorCode: 'ERR_OUTSIDE_SHIFT',
        technicianId: technician.id,
        serviceRequestId: request.id,
        message: `Technician ${technician.name} is currently marked unavailable (called out / sick)`,
      });
    } else if (asgnStart < shiftStart || asgnEnd > shiftEnd) {
      violations.push({
        rule: 'SHIFT',
        errorCode: 'ERR_OUTSIDE_SHIFT',
        technicianId: technician.id,
        serviceRequestId: request.id,
        message: `Assignment time ${assignment.startTime}–${assignment.endTime} falls outside ${technician.name}'s working shift (${technician.shiftStart}–${technician.shiftEnd})`,
      });
    }

    // Rule 4: Customer Preferred Time Window
    const winStart = this.timeToMinutes(request.windowStart);
    const winEnd = this.timeToMinutes(request.windowEnd);

    if (asgnStart < winStart || asgnEnd > winEnd) {
      violations.push({
        rule: 'WINDOW',
        errorCode: 'ERR_OUTSIDE_WINDOW',
        technicianId: technician.id,
        serviceRequestId: request.id,
        message: `Assignment time ${assignment.startTime}–${assignment.endTime} breaches customer preferred window (${request.windowStart}–${request.windowEnd})`,
      });
    }

    // Rule 7: Completed / In-Progress Assignment Immutability
    if (lockedAssignment && (lockedAssignment.lockState === 'LOCKED_COMPLETED' || lockedAssignment.status === 'COMPLETED')) {
      if (
        lockedAssignment.technicianId !== assignment.technicianId ||
        lockedAssignment.startTime !== assignment.startTime ||
        lockedAssignment.endTime !== assignment.endTime
      ) {
        violations.push({
          rule: 'COMPLETED_LOCK',
          errorCode: 'ERR_COMPLETED_JOB_LOCKED',
          serviceRequestId: request.id,
          technicianId: technician.id,
          message: `Illegal modification: Work order ${request.id} is marked COMPLETED and is permanently locked to ${technician.name} at ${lockedAssignment.startTime}`,
        });
      }
    }

    return violations;
  }

  /**
   * Authoritative batch validator for an entire proposed schedule
   * Enforces all 7 Hard Constraints deterministically
   */
  public static validateSchedule(
    proposedAssignments: ProposedAssignment[],
    technicians: Map<string, Technician>,
    requests: Map<string, ServiceRequest>,
    lockedAssignmentsMap: Map<string, Assignment> = new Map()
  ): ScheduleValidationResult {
    const violations: ValidationViolation[] = [];
    const technicianLoadMap: Record<string, number> = {};
    const assignmentsByTech = new Map<string, ProposedAssignment[]>();

    for (const assignment of proposedAssignments) {
      const tech = technicians.get(assignment.technicianId);
      const req = requests.get(assignment.serviceRequestId);

      if (!tech || !req) {
        violations.push({
          rule: 'SKILL',
          errorCode: 'ERR_ENTITY_NOT_FOUND',
          serviceRequestId: assignment.serviceRequestId,
          message: `Referenced entity not found for assignment ${assignment.serviceRequestId}`,
        });
        continue;
      }

      // Check single-assignment rules (Skill, Region, Shift, Window, Completed Lock)
      const locked = lockedAssignmentsMap.get(assignment.serviceRequestId);
      const singleViolations = this.validateSingleAssignment(assignment, tech, req, locked);
      violations.push(...singleViolations);

      // Track assignments by tech for Overlap & Workload rules
      const list = assignmentsByTech.get(tech.id) || [];
      list.push(assignment);
      assignmentsByTech.set(tech.id, list);

      technicianLoadMap[tech.id] = (technicianLoadMap[tech.id] || 0) + assignment.durationMinutes;
    }

    // Rule 5: Overlap / Double-Booking Prevention & Rule 6: Max Workload
    for (const [techId, list] of assignmentsByTech.entries()) {
      const tech = technicians.get(techId);
      if (!tech) continue;

      // Sort by start time for collision check
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let i = 0; i < list.length - 1; i++) {
        const curEnd = this.timeToMinutes(list[i].endTime);
        const nextStart = this.timeToMinutes(list[i + 1].startTime);

        // Strict collision: current ends AFTER next starts
        if (curEnd > nextStart) {
          violations.push({
            rule: 'OVERLAP',
            errorCode: 'ERR_DOUBLE_BOOKING',
            technicianId: techId,
            serviceRequestId: list[i + 1].serviceRequestId,
            message: `Double-booking conflict for ${tech.name}: Task ${list[i].serviceRequestId} (${list[i].startTime}–${list[i].endTime}) overlaps with Task ${list[i + 1].serviceRequestId} (${list[i + 1].startTime}–${list[i + 1].endTime})`,
          });
        }
      }

      // Rule 6: Max Workload Cap
      const totalMinutes = technicianLoadMap[techId] || 0;
      if (totalMinutes > tech.maxWorkloadMinutes) {
        violations.push({
          rule: 'WORKLOAD',
          errorCode: 'ERR_EXCEEDS_MAX_WORKLOAD',
          technicianId: techId,
          message: `Technician ${tech.name} total scheduled work (${totalMinutes}m) exceeds daily maximum workload limit (${tech.maxWorkloadMinutes}m)`,
        });
      }
    }

    // Build workload summary for all technicians
    const technicianWorkloadSummary: Record<string, { usedMinutes: number; maxMinutes: number }> = {};
    for (const tech of technicians.values()) {
      technicianWorkloadSummary[tech.id] = {
        usedMinutes: technicianLoadMap[tech.id] || 0,
        maxMinutes: tech.maxWorkloadMinutes,
      };
    }

    return {
      isValid: violations.length === 0,
      violations,
      technicianWorkloadSummary,
    };
  }

  /**
   * Computes exact visual differences between an existing schedule version and a proposed plan
   */
  public static computeScheduleDiff(
    currentAssignments: Assignment[],
    proposedAssignments: ProposedAssignment[],
    allRequests: ServiceRequest[]
  ): {
    unchanged: string[];
    rescheduled: Array<{
      serviceRequestId: string;
      technicianId: string;
      oldStart: string;
      newStart: string;
      oldEnd: string;
      newEnd: string;
    }>;
    reassigned: Array<{
      serviceRequestId: string;
      fromTechId: string;
      toTechId: string;
      newStart: string;
      newEnd: string;
    }>;
    newlyAssigned: string[];
    unassigned: string[];
  } {
    const currentMap = new Map<string, Assignment>();
    for (const a of currentAssignments) {
      currentMap.set(a.serviceRequestId, a);
    }

    const proposedMap = new Map<string, ProposedAssignment>();
    for (const p of proposedAssignments) {
      proposedMap.set(p.serviceRequestId, p);
    }

    const unchanged: string[] = [];
    const rescheduled: any[] = [];
    const reassigned: any[] = [];
    const newlyAssigned: string[] = [];
    const unassigned: string[] = [];

    // Evaluate proposed assignments against current
    for (const [reqId, prop] of proposedMap.entries()) {
      const cur = currentMap.get(reqId);
      if (!cur) {
        newlyAssigned.push(reqId);
      } else if (cur.technicianId === prop.technicianId && cur.startTime === prop.startTime) {
        unchanged.push(reqId);
      } else if (cur.technicianId !== prop.technicianId) {
        reassigned.push({
          serviceRequestId: reqId,
          fromTechId: cur.technicianId,
          toTechId: prop.technicianId,
          newStart: prop.startTime,
          newEnd: prop.endTime,
        });
      } else {
        rescheduled.push({
          serviceRequestId: reqId,
          technicianId: prop.technicianId,
          oldStart: cur.startTime,
          newStart: prop.startTime,
          oldEnd: cur.endTime,
          newEnd: prop.endTime,
        });
      }
    }

    // Evaluate all requests to identify unassigned
    for (const req of allRequests) {
      if (!proposedMap.has(req.id)) {
        unassigned.push(req.id);
      }
    }

    return {
      unchanged,
      rescheduled,
      reassigned,
      newlyAssigned,
      unassigned,
    };
  }
}
