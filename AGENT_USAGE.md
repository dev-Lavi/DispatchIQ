# AGENT_USAGE.md — Field Service Dispatch & Replanning Agent

This document details the AI architecture, tooling, representative prompts, delegated tasks, failure recovery, and verification workflows implemented in **DispatchIQ**, per the Hackathon/Assessment Repository Requirements.

---

## 1. Architectural Philosophy: "AI Proposes, Code Validates, Human Approves"

In mission-critical field operations, Large Language Models (LLMs) cannot be granted unconstrained write access to scheduling databases. DispatchIQ enforces a strict tri-tier boundary:

```mermaid
flowchart LR
    A[Work Order & Fleet State] --> B[AI Planning Agent (Gemini 1.5 Flash)]
    B --> C[Structured Proposal JSON]
    C --> D[Deterministic Hard Constraint Engine]
    D --> E{All Hard Rules Pass?}
    E -- Violations Detected --> F[Rejection / Fallback Heuristic Solver]
    E -- Validated --> G[Human Dispatcher Review Drawer]
    G -- Human Rejects --> H[Draft Discarded]
    G -- Human Approves --> I[Immutable Schedule Commit & SMS/Push]
```

1. **AI Layer (Gemini 1.5 Flash)**: Acts purely as an operational advisor. Evaluates soft trade-offs, generates candidate itineraries, explains bottlenecks, and proposes proactive clarification questions.
2. **Deterministic Constraint Engine (Pure TypeScript)**: Zero-dependency, mathematically rigorous validator. Validates 7 immutable operational rules before any human review.
3. **Human-in-the-Loop (Dispatcher)**: Retains ultimate operational authority. Dispatchers inspect diffs, apply manual overrides, and formally approve or reject proposals.

---

## 2. Tools & Models Used

| Tool / Model | Version / Provider | Role & Responsibility |
| :--- | :--- | :--- |
| **Google Gemini 1.5 Flash** | Google AI Studio REST API | Cloud LLM generating structured JSON schedule proposals, trade-off analysis, and proactive dispatcher questions. |
| **Local Heuristic Solver** | Built-in TypeScript Solver | Zero-token, instant fallback solver ensuring 100% system availability if the external LLM is offline or unconfigured. |
| **Zod** | v3.24.2 | Strict runtime schema parsing and validation of LLM outputs before feeding them to the business engine. |
| **Deterministic Rule Engine** | In-House TypeScript Engine | Enforces shift windows, skill matches, territories, double-booking prevention, workload limits, and task locks. |
| **Antigravity Agent** | DeepMind Coding Agent | Used for pair-programming, scaffolding, test generation, and full-stack UI/backend implementation. |
| **Vitest & Supertest** | Vitest v3.0.7, Supertest v7 | Automated verification suite ensuring 100% rule compliance across edge cases. |

---

## 3. Representative Prompts & Structured JSON Schema

The AI planning agent is prompted with structured JSON input containing the current fleet status, work orders, locked tasks, and the disruption trigger reason.

### 3.1 System Prompt Structure (from `server/src/ai/planningService.ts`)

```text
You are the Field Service Dispatch & Replanning Agent.
Operating Day: 2026-10-15.
Technicians: [ { id, name, region, skills, shiftStart, shiftEnd, maxWorkloadMinutes } ]
Requests: [ { id, customerName, region, requiredSkill, priority, durationMinutes, windowStart, windowEnd } ]
Existing Locked Assignments: [ { serviceRequestId, status: "COMPLETED" } ]
Trigger: EMERGENCY_REPLAN | TECHNICIAN_CANCELLATION | INITIAL_PLAN

HARD CONSTRAINTS:
1. Skills must match exactly.
2. Region must match exactly.
3. Assignment must be within technician shift and customer window.
4. No double booking / overlaps.
5. Workload <= maxWorkloadMinutes.
6. COMPLETED tasks are IMMUTABLY LOCKED.

Output valid JSON strictly matching the plan schema:
{
  "planSummary": string,
  "assignments": [{
    "serviceRequestId": string,
    "technicianId": string,
    "startTime": "HH:mm",
    "endTime": "HH:mm",
    "durationMinutes": number,
    "reasoning": string
  }],
  "unassignedRequests": [{
    "serviceRequestId": string,
    "reason": string,
    "recommendedAction": string
  }],
  "risks": [{ "severity": "LOW"|"MEDIUM"|"HIGH", "description": string }],
  "tradeOffs": [string],
  "suggestedQuestions": [string]
}
```

---

## 4. Delegated Work vs. Hard Guardrails

| Capability | Delegated to AI Agent | Handled by Deterministic Engine |
| :--- | :---: | :---: |
| Combinatorial assignment generation | ✅ | ❌ |
| Territory boundary verification | ❌ | ✅ (Strict string equality check) |
| Skill certificate matching | ❌ | ✅ (`tech.skills.includes(req.requiredSkill)`) |
| Double-booking / collision prevention | ❌ | ✅ (Interval intersection mathematics) |
| Completed task immutability | ❌ | ✅ (Immutable lock enforcement) |
| Daily workload quota calculation | ❌ | ✅ (`sum(duration) <= maxWorkloadMinutes`) |
| Trade-off explanations & operational reasoning | ✅ | ❌ |
| Bottleneck identification (e.g. SR-110 capacity cap) | ✅ | ❌ |
| Database write & version publishing | ❌ | ✅ (Human dispatcher approval required) |

---

## 5. Important Agent Mistakes Encountered & How They Were Resolved

During development and stress-testing of LLM prompt outputs, several characteristic LLM failures were documented and resolved through architectural guardrails:

### Mistake 1: Regional Cross-Contamination
* **Observed LLM Behavior**: When tasked with unassigned Central region jobs, Gemini occasionally attempted to assign Carlos Rivera (North Region) to a Central Plumbing job because Carlos possessed the "Plumbing" skill.
* **Why it Happened**: The LLM prioritized skill compatibility over regional territory boundaries in tight optimization loops.
* **How Resolved**: The `DeterministicConstraintEngine` was placed immediately downstream of the LLM parser. If a region mismatch occurs, the candidate plan is rejected and logged as a hard rule violation (`REGION_MISMATCH`), triggering fallback heuristic correction.

### Mistake 2: Completed Task Rescheduling during Emergency Replanning
* **Observed LLM Behavior**: Upon receiving the emergency plumbing ticket at St. Jude Hospital (`SR-111`), the LLM attempted to move a morning appointment (`SR-101`) to the afternoon to create an open morning window. However, `SR-101` was already marked `COMPLETED` by Carlos.
* **Why it Happened**: The LLM treated the entire 08:00–17:00 timeline as mutable white space.
* **How Resolved**: Added rule `COMPLETED_TASK_MUTATION` in the hard constraint engine. Any proposed schedule modifying the start time, end time, or technician assignment of an assignment in `LOCKED_COMPLETED` state is mathematically rejected.

### Mistake 3: Hallucinated Time Windows and Non-Standard Time Formats
* **Observed LLM Behavior**: The LLM occasionally output end times in non-standard formats (e.g. `9:30 AM` or `09:30:00` instead of `09:30`) or scheduled jobs starting at `08:45` when the customer window was `09:00–12:00`.
* **How Resolved**: Implemented strict Zod schema regex validation (`/^([01]\d|2[0-3]):([0-5]\d)$/`). If parsing fails, the error is trapped cleanly and the local deterministic heuristic planner takes over seamlessly without crashing the frontend.

---

## 6. How Agent Output Was Verified

Verification is implemented across three testing layers:

1. **Automated Unit & Integration Tests (16 Passing Tests)**:
   - `constraintEngine.test.ts`: Verifies all 7 hard rules in isolation (skill mismatch, region mismatch, shift boundary violations, customer window violations, double bookings, daily workload limits, completed task lock).
   - `planningService.test.ts`: Verifies AI proposal ingestion, Zod schema validation, and fallback solver activation.
   - `routes.test.ts`: Tests complete REST API lifecycle, version creation, and manual override workflows.
2. **Visual Schedule Diffing (`DiffModal.tsx`)**:
   - Visualizes schedule delta across versions: `UNCHANGED`, `RESCHEDULED`, `REASSIGNED`, `NEW`, and `UNASSIGNED`.
3. **Audit Ledger (`AuditNotificationTabs.tsx`)**:
   - Every proposal generation, manual override, status change, and dispatcher approval is recorded in an immutable chronological audit trail with timestamp and actor attribution (`DISPATCHER`, `AI_AGENT`, `SYSTEM`).
