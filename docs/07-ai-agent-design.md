# 07 — AI Agent Design: Planning, Reasoning & Safety Architecture

## 1. Agent Mission & Responsibility Boundary

The AI Planning Agent functions as an **expert dispatch copilot**. Its purpose is to perform combinatorial heuristic reasoning, navigate complex multi-variable trade-offs, provide intelligible operational explanations, and alert dispatchers to latent risks and ambiguities.

```
+----------------------------------------------------------------------------------------------------+
|                                    RESPONSIBILITY DIVISION                                         |
+----------------------------------------------------------------------------------------------------+
|               AI AGENT (PROBABILISTIC)             |        BACKEND (DETERMINISTIC ENGINE)         |
+----------------------------------------------------+-----------------------------------------------+
| * Propose optimized assignment pairings            | * Reject skill mismatches (ERR_SKILL_MISMATCH)|
| * Reason through competing multi-variable trade-offs| * Reject cross-region jobs (ERR_REGION_MISMATCH)|
| * Explain why Technician A was selected over Tech B | * Block shift overflows (ERR_OUTSIDE_SHIFT)   |
| * Flag operational risks (e.g. tight 15m turnaround)| * Block window breaches (ERR_OUTSIDE_WINDOW)  |
| * Identify unassignable bottlenecks & root causes  | * Block double bookings (ERR_DOUBLE_BOOKING)  |
| * Suggest clarifying questions for dispatchers     | * Block workload cap overruns (ERR_WORKLOAD)  |
| * Suggest replans during emergency disruptions     | * Freeze completed tasks (ERR_COMPLETED_LOCK) |
| * Output STRICT typed JSON                         | * Authoritative source of schedule validity   |
+----------------------------------------------------+-----------------------------------------------+
```

---

## 2. Agent Input Context Specification

The backend compiles an unambiguous, structured prompt context containing:
1. **Operating Parameters**: Target date, operating window (08:00–17:00), default time step (15 mins).
2. **Technician Roster**: ID, name, region, certified skills array, shift availability window, remaining workload quota.
3. **Pending Service Requests**: ID, customer name, region, required skill, priority level, duration in minutes, customer preferred window.
4. **Active/Locked Assignments**: Existing assignments marked `COMPLETED` or `IN_PROGRESS` (with immutable technician IDs, start times, and durations) that must be preserved.
5. **Operational Goal / Trigger**: `"INITIAL_PLAN"`, `"EMERGENCY_REPLAN"`, or `"TECHNICIAN_CANCELLATION"`.

---

## 3. Strict Structured Output Schema (Zod & JSON Schema)

To guarantee type safety, the LLM is constrained via Google Gemini API's native structured JSON schema mode (`responseMimeType: "application/json"`, `responseSchema`) matching this Zod definition:

```typescript
import { z } from 'zod';

export const ProposedAssignmentSchema = z.object({
  serviceRequestId: z.string().describe("ID of the service request to assign"),
  technicianId: z.string().describe("ID of the technician assigned"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm format"),
  reasoning: z.string().describe("Concise explanation of why this technician and time slot was chosen")
});

export const UnassignedRequestAnalysisSchema = z.object({
  serviceRequestId: z.string(),
  reason: z.string().describe("Deterministic root cause why request could not be placed"),
  recommendedAction: z.string().describe("Actionable operational remedy (e.g. reschedule or extend window)")
});

export const OperationalRiskSchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  description: z.string().describe("Description of the operational risk (e.g. tight buffer, near shift end)"),
  affectedTechnicianId: z.string().optional(),
  affectedRequestId: z.string().optional()
});

export const ScheduleProposalSchema = z.object({
  planSummary: z.string().describe("Executive summary of the proposed schedule"),
  assignments: z.array(ProposedAssignmentSchema),
  unassignedRequests: z.array(UnassignedRequestAnalysisSchema),
  risks: z.array(OperationalRiskSchema),
  tradeOffs: z.array(z.string()).describe("List of trade-offs made during planning"),
  suggestedQuestions: z.array(z.string()).describe("Proactive questions for dispatcher regarding ambiguities or edge cases"),
  replanningRationale: z.string().optional().describe("Summary of changes made if replanning from a prior schedule")
});

export type ScheduleProposal = z.infer<typeof ScheduleProposalSchema>;
```

---

## 4. System Prompt Architecture

```text
You are the Field Service Dispatch & Replanning Agent, an expert operational assistant for field dispatchers.
Your mission is to assign service requests to qualified technicians for a single operating day.

CRITICAL OPERATIONAL RULES:
1. HARD CONSTRAINTS (Violations will cause system rejection):
   - A technician MUST possess the request's exact required skill.
   - A technician MUST belong to the request's exact region.
   - Assignments MUST fall strictly within technician shift hours (shiftStart to shiftEnd).
   - Assignments MUST fall strictly within customer preferred time windows (windowStart to windowEnd).
   - NO overlapping assignments for the same technician.
   - Total scheduled work minutes for a technician MUST NOT exceed maxWorkloadMinutes.
   - ALL tasks marked as COMPLETED or IN_PROGRESS are IMMUTABLY LOCKED. You MUST preserve their technicianId and startTime verbatim.

2. SOFT OBJECTIVES (Reason through these trade-offs):
   - Prioritize EMERGENCY and HIGH priority requests over MEDIUM/LOW.
   - Balance workload fairly across technicians where possible.
   - Minimize idle travel gaps between consecutive tasks for a technician.
   - Preserve 15-minute buffers between assignments where feasible.

3. UNASSIGNED REQUESTS & AMBIGUITY:
   - If a request cannot be assigned without violating hard constraints, leave it UNASSIGNED.
   - Explicitly detail the root bottleneck in 'unassignedRequests'.
   - If customer time windows are too narrow, suggest clarifying questions in 'suggestedQuestions'.

4. OUTPUT FORMAT:
   - You MUST output valid JSON strictly matching the provided JSON Schema.
   - Do NOT enclose JSON in markdown backticks or commentary.
```

---

## 5. Verification & Repair Loop

```
   Raw LLM Generation
          │
          ▼
   Zod Schema Parser  ─────(Invalid JSON / Schema Fail)─────►  Auto-Retry / Fallback Heuristic
          │ (Valid Syntax)
          ▼
Deterministic Constraint Engine
          │
    ┌─────┴─────────────────────────────────┐
    │                                       │
 [PASS]                                  [FAIL]
    │                                       │
    ▼                                       ▼
Present to Dispatcher        Generate Constraint Violation Report
(Active Draft Proposal)      ├─ Attempt 1-Shot Constraint Repair Prompt
                             └─ If Repair Fails: Fallback to Deterministic Greedy Solver
```

### Self-Correction & Repair Prompting
If the deterministic engine detects a constraint breach in the AI's proposal (e.g. `ERR_DOUBLE_BOOKING` on Technician Carlos), the backend executes an immediate automated correction pass:
```text
System: Your prior proposal contained 1 hard constraint violation:
- ERR_DOUBLE_BOOKING: Assignment SR-102 (10:00-11:30) overlaps with SR-105 (11:00-12:00) for Technician Carlos.
Please re-evaluate and correct this conflict while maintaining all other constraints.
```
If the repair fails or times out, the system falls back to the **Deterministic Heuristic Planner**, guaranteeing zero system downtime.

---

## 6. Deterministic Fallback & Mock Agent Mode

To support robust offline testing, instant CI/CD validation, and token-free local development, the application includes a deterministic heuristic solver:
* **Algorithm**: Priority-Sorted Greedy Slot-Allocation.
  1. Filter out locked/completed assignments and place them in the schedule grid.
  2. Sort unassigned requests by: `Priority (EMERGENCY > HIGH > MEDIUM > LOW)` then `windowEnd ASC`.
  3. For each request, find eligible technicians matching `skill` and `region`.
  4. Search for the earliest non-overlapping slot within `[max(shiftStart, windowStart), min(shiftEnd, windowEnd) - duration]`.
  5. If slot fits and workload cap permits, assign; otherwise, push to `unassignedRequests` with the reason `"Capacity exhausted"`.
* **Toggle**: Controlled via environment variable `AI_PROVIDER=gemini` (Free tier from Google AI Studio) or `AI_PROVIDER=mock` (Built-in zero-token local heuristic solver, requiring no API key).

---

## 7. Clarification Question Generation

When information is missing or restricts feasible solutions, the AI agent formulates proactive dispatcher questions. Examples:
* **Window Tightness**: *"Request SR-108 requires 90 minutes but customer window is only 09:00–10:00. Can customer accommodate an arrival up to 11:00?"*
* **Skill Shortage**: *"No available technician in North Region has the 'Commercial Electrical' certification. Can regional boundaries be relaxed for Technician Dave from Central?"*
* **Overtime Authorization**: *"Technician Alex is 20 minutes over maximum workload cap. Can 30 minutes of overtime be authorized to prevent delaying emergency leak repair?"*
