# 06 — Scheduling Rules & Deterministic Constraint Engine

## 1. Core Constraint Philosophy

In the **Field Service Dispatch & Replanning Agent**, scheduling boundaries are strictly bifurcated into two distinct categories:

1. **Hard Constraints (Deterministic Invariants)**: Non-negotiable mathematical and operational rules. If a single hard constraint is violated, the candidate schedule is invalid and strictly prohibited from being confirmed or dispatched.
2. **Soft Preferences (Heuristic Trade-offs)**: Optimizations that the AI Planning Agent balances to improve schedule quality (e.g. minimizing idle gaps, balancing technician workloads, prioritizing emergency tickets).

---

## 2. Hard Constraints vs. Soft Preferences

```
+---------------------------------------------------------------------------------------------------+
|                                        SCHEDULING RULES                                           |
+---------------------------------------------------------------------------------------------------+
|  HARD CONSTRAINTS (Deterministic Code Validates)   |  SOFT PREFERENCES (AI Agent Optimizes)       |
|  * Reject immediately on violation                 |  * Multi-objective trade-off balancing        |
|  * 100% mathematical certainty                    |  * Plain-text explanation of compromises      |
+----------------------------------------------------+----------------------------------------------+
|  1. Skill Match: tech.skills.includes(req.skill)   |  1. Workload Equity: balance hours evenly    |
|  2. Region Match: tech.region === req.region       |  2. Route Continuity: minimize idle gaps     |
|  3. Shift Window: start >= shiftStart && end <= end|  3. Priority Ranking: schedule High/Emerg 1st|
|  4. Customer Window: start >= wStart && end <= wEnd|  4. Tech Familiarity: keep prior technician  |
|  5. Overlap Zero: startA < endB && endA > startB   |  5. Buffer Slack: preserve 15m safety margin |
|  6. Max Workload: sum(durations) <= tech.maxMins   |                                              |
|  7. Completed Job Lock: completed jobs immutable   |                                              |
+----------------------------------------------------+----------------------------------------------+
```

---

## 3. The 7 Hard Constraints (Deterministic Specifications)

### Rule 1: Skill Compatibility (`validateSkill`)
* **Formal Definition**: The assigned technician must possess the exact `requiredSkill` specified by the service request.
* **Logic**:
  $$\text{request.requiredSkill} \in \text{technician.skills}$$
* **Error Code**: `ERR_SKILL_MISMATCH`
* **Error Message**: `"Technician [Name] does not possess required skill [Skill] (Available: [Skills])."`

### Rule 2: Regional Territory Integrity (`validateRegion`)
* **Formal Definition**: The assigned technician's operational region must match the service request's regional location.
* **Logic**:
  $$\text{technician.region} = \text{request.region}$$
* **Error Code**: `ERR_REGION_MISMATCH`
* **Error Message**: `"Technician [Name] is assigned to region [TechRegion], but request is located in [ReqRegion]."`

### Rule 3: Shift Working Hours (`validateAvailability`)
* **Formal Definition**: The assignment time span $[\text{startTime}, \text{endTime}]$ must fall entirely within the technician's defined shift working hours $[\text{shiftStart}, \text{shiftEnd}]$ and technician must be marked `isAvailable = true`.
* **Logic**:
  $$\text{startTime} \ge \text{technician.shiftStart} \quad \land \quad \text{endTime} \le \text{technician.shiftEnd} \quad \land \quad \text{technician.isAvailable} = \text{true}$$
* **Error Code**: `ERR_OUTSIDE_SHIFT`
* **Error Message**: `"Assignment [Start-End] extends beyond [Name]'s shift hours [ShiftStart-ShiftEnd] or technician is unavailable."`

### Rule 4: Customer Preferred Time Window (`validateTimeWindow`)
* **Formal Definition**: The assignment time span $[\text{startTime}, \text{endTime}]$ must fall strictly within the customer's requested time window $[\text{windowStart}, \text{windowEnd}]$.
* **Logic**:
  $$\text{startTime} \ge \text{request.windowStart} \quad \land \quad \text{endTime} \le \text{request.windowEnd}$$
* **Error Code**: `ERR_OUTSIDE_WINDOW`
* **Error Message**: `"Assignment [Start-End] breaches customer preferred window [WindowStart-WindowEnd]."`

### Rule 5: Double-Booking Prevention (`validateNoOverlap`)
* **Formal Definition**: For any technician, no two scheduled assignments $A$ and $B$ can share overlapping time intervals.
* **Logic**:
  $$\forall A, B \in \text{Assignments}_{\text{tech}} \, (A \ne B): \quad \neg (\text{start}_A < \text{end}_B \land \text{end}_A > \text{start}_B)$$
* **Error Code**: `ERR_DOUBLE_BOOKING`
* **Error Message**: `"Collision detected for [Name]: Assignment [ID_A] ([Start_A]-[End_A]) overlaps with Assignment [ID_B] ([Start_B]-[End_B])."`

### Rule 6: Maximum Daily Workload Cap (`validateWorkload`)
* **Formal Definition**: The sum of all scheduled assignment durations for a given technician on the target day must not exceed their `maxWorkloadMinutes`.
* **Logic**:
  $$\sum_{A \in \text{Assignments}_{\text{tech}}} \text{durationMinutes}_A \le \text{technician.maxWorkloadMinutes}$$
* **Error Code**: `ERR_EXCEEDS_MAX_WORKLOAD`
* **Error Message**: `"Technician [Name] total scheduled time ([Total] mins) exceeds maximum permitted workload ([Max] mins)."`

### Rule 7: Completed Assignment Immutability (`validateCompletedAssignment`)
* **Formal Definition**: Once an assignment has achieved status `COMPLETED` or `IN_PROGRESS` in an active schedule version, its `technicianId`, `startTime`, and `durationMinutes` become permanently immutable in any subsequent schedule version or replan.
* **Logic**:
  $$\text{existing.status} \in \{\text{COMPLETED}, \text{IN_PROGRESS}\} \implies (\text{candidate.techId} = \text{existing.techId} \land \text{candidate.start} = \text{existing.start})$$
* **Error Code**: `ERR_COMPLETED_JOB_LOCKED`
* **Error Message**: `"Illegal modification: Assignment [ID] is [Status] and cannot be moved or reassigned."`

---

## 4. Deterministic Engine Implementation Blueprint

```typescript
export interface ValidationViolation {
  rule: 'SKILL' | 'REGION' | 'SHIFT' | 'WINDOW' | 'OVERLAP' | 'WORKLOAD' | 'COMPLETED_LOCK';
  errorCode: string;
  technicianId?: string;
  serviceRequestId?: string;
  message: string;
}

export interface ScheduleValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  technicianWorkloadSummary: Record<string, { usedMinutes: number; maxMinutes: number }>;
}

export class DeterministicConstraintEngine {
  /**
   * Pure deterministic validator executing all 7 hard rules
   */
  public static validateSchedule(
    proposedAssignments: ProposedAssignment[],
    technicians: Map<string, Technician>,
    requests: Map<string, ServiceRequest>,
    lockedAssignments: Map<string, Assignment>
  ): ScheduleValidationResult {
    const violations: ValidationViolation[] = [];
    const technicianLoadMap: Record<string, number> = {};

    // Group assignments by technician for overlap and workload checks
    const assignmentsByTech = new Map<string, ProposedAssignment[]>();

    for (const assignment of proposedAssignments) {
      const tech = technicians.get(assignment.technicianId);
      const req = requests.get(assignment.serviceRequestId);

      if (!tech || !req) {
        violations.push({
          rule: 'SKILL',
          errorCode: 'ERR_ENTITY_NOT_FOUND',
          message: `Referenced entity not found for assignment ${assignment.serviceRequestId}`
        });
        continue;
      }

      // Rule 1: Skill
      if (!tech.skills.includes(req.requiredSkill)) {
        violations.push({
          rule: 'SKILL',
          errorCode: 'ERR_SKILL_MISMATCH',
          technicianId: tech.id,
          serviceRequestId: req.id,
          message: `${tech.name} lacks required skill ${req.requiredSkill}`
        });
      }

      // Rule 2: Region
      if (tech.region !== req.region) {
        violations.push({
          rule: 'REGION',
          errorCode: 'ERR_REGION_MISMATCH',
          technicianId: tech.id,
          serviceRequestId: req.id,
          message: `${tech.name} region (${tech.region}) != request region (${req.region})`
        });
      }

      // Rule 3: Shift Availability
      if (!tech.isAvailable || assignment.startTime < tech.shiftStart || assignment.endTime > tech.shiftEnd) {
        violations.push({
          rule: 'SHIFT',
          errorCode: 'ERR_OUTSIDE_SHIFT',
          technicianId: tech.id,
          serviceRequestId: req.id,
          message: `Assignment ${assignment.startTime}-${assignment.endTime} outside shift ${tech.shiftStart}-${tech.shiftEnd}`
        });
      }

      // Rule 4: Customer Time Window
      if (assignment.startTime < req.windowStart || assignment.endTime > req.windowEnd) {
        violations.push({
          rule: 'WINDOW',
          errorCode: 'ERR_OUTSIDE_WINDOW',
          technicianId: tech.id,
          serviceRequestId: req.id,
          message: `Assignment ${assignment.startTime}-${assignment.endTime} outside window ${req.windowStart}-${req.windowEnd}`
        });
      }

      // Rule 7: Completed Job Lock
      const locked = lockedAssignments.get(req.id);
      if (locked && (locked.status === 'COMPLETED' || locked.status === 'IN_PROGRESS')) {
        if (locked.technicianId !== assignment.technicianId || locked.startTime !== assignment.startTime) {
          violations.push({
            rule: 'COMPLETED_LOCK',
            errorCode: 'ERR_COMPLETED_JOB_LOCKED',
            serviceRequestId: req.id,
            message: `Locked assignment for request ${req.id} cannot be moved or reassigned`
          });
        }
      }

      // Aggregate for Rule 5 & 6
      const techList = assignmentsByTech.get(tech.id) || [];
      techList.push(assignment);
      assignmentsByTech.set(tech.id, techList);
      technicianLoadMap[tech.id] = (technicianLoadMap[tech.id] || 0) + assignment.durationMinutes;
    }

    // Rule 5: Overlap & Rule 6: Workload
    for (const [techId, list] of assignmentsByTech.entries()) {
      const tech = technicians.get(techId)!;

      // Overlap check O(N log N)
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < list.length - 1; i++) {
        if (list[i].endTime > list[i + 1].startTime) {
          violations.push({
            rule: 'OVERLAP',
            errorCode: 'ERR_DOUBLE_BOOKING',
            technicianId: techId,
            message: `Double booking detected between requests ${list[i].serviceRequestId} and ${list[i + 1].serviceRequestId}`
          });
        }
      }

      // Workload cap
      if (technicianLoadMap[techId] > tech.maxWorkloadMinutes) {
        violations.push({
          rule: 'WORKLOAD',
          errorCode: 'ERR_EXCEEDS_MAX_WORKLOAD',
          technicianId: techId,
          message: `${tech.name} total work (${technicianLoadMap[techId]}m) exceeds cap (${tech.maxWorkloadMinutes}m)`
        });
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      technicianWorkloadSummary: Object.fromEntries(
        Array.from(technicians.values()).map(t => [
          t.id,
          { usedMinutes: technicianLoadMap[t.id] || 0, maxMinutes: t.maxWorkloadMinutes }
        ])
      )
    };
  }
}
```

---

## 5. Disruption & Replanning Protocols

### 5.1 Emergency Request Protocol
1. **Intake**: A new service request arrives with `priority: EMERGENCY`.
2. **Lock Phase**: System flags all existing `COMPLETED` and `IN_PROGRESS` assignments as immutable blocks on technician timelines.
3. **Preemption Strategy**:
   * If a qualified technician in the region has an idle slot matching the emergency window, slot it without disruption.
   * If no idle slot exists, the AI proposes displacing the lowest-priority unstarted task (`LOW` or `MEDIUM`) to the unassigned backlog.
4. **Validation**: Candidate replan is verified by `DeterministicConstraintEngine`.
5. **Presentation**: Diff UI highlights the displaced request and the newly inserted emergency request for dispatcher review.

### 5.2 Technician Cancellation Protocol
1. **Trigger**: Dispatcher marks Technician $T_k$ as unavailable (`isAvailable = false`).
2. **Identification**: System isolates all pending assignments assigned to $T_k$. Completed tasks remain locked to $T_k$ as historical fact.
3. **Redistribution**: AI attempts to reassign orphaned tasks to surviving technicians possessing the required skill, matching region, and available workload capacity.
4. **Unassigned Spillover**: Any task that cannot legally fit another technician without violating hard rules is gracefully moved to `UNASSIGNED` with clear trade-off explanations.

### 5.3 Manual Dispatcher Override Protocol
* The dispatcher can adjust any unstarted assignment directly from the UI.
* Before any manual change is persisted, `DeterministicConstraintEngine.validateAssignment()` runs in real time.
* If a violation occurs, the UI displays an inline warning banner explaining the exact constraint breached.
* The dispatcher must either rectify the conflict or cancel the override. Hard constraints can **never** be forcefully bypassed.
