# 01 — Problem Definition: Field Service Dispatch & Replanning Agent

## 1. Problem Statement

Field service operations require assigning a bounded set of customer service requests to qualified, geographically assigned field technicians for a single working day. In high-stakes dispatch environments, manual scheduling is brittle and cognitively demanding: dispatchers must balance skills, regional territories, customer availability windows, shift durations, and workload caps.

When day-of-service disruptions inevitably occur—such as sudden technician cancellations or high-priority emergency work orders—dispatchers face severe replanning pressure. They must rapidly reallocate work without double-booking technicians, breaching customer service windows, or disrupting tasks that are already completed or actively in progress.

While modern Large Language Models (LLMs) excel at multi-objective heuristic trade-off reasoning and natural language explanation, they are fundamentally probabilistic and prone to constraint hallucinations. Pure manual dispatch is slow; pure automated optimization is opaque and rigid. 

This project solves this challenge through a hybrid, human-in-the-loop paradigm governed by one core architectural principle:
> **"AI proposes. Deterministic code validates. Human approves."**

---

## 2. Target User & Persona

### Primary User: The Field Service Dispatcher (Operator)
* **Role**: Operational controller responsible for territory schedule integrity, customer SLA fulfillment, and technician productivity during the working day.
* **Pain Points**:
  * Mental fatigue juggling multi-variable hard constraints (skills, regions, time windows).
  * Panic during intraday disruptions (technician call-outs, emergency leak/power outages).
  * Lack of clear explanation when automated tools suggest counter-intuitive reassignments.
  * Fear of automation overriding boots-on-the-ground reality or moving completed work.
* **Key Needs**:
  * High-clarity visual timeline of technician assignments for the day.
  * Intelligent, explainable assignment proposals that highlight trade-offs and risks.
  * Guaranteed safety: mathematical assurance that zero invalid assignments reach technicians.
  * Total supervisory control: one-click approval, easy manual adjustments, and auditable version history.

---

## 3. Core Business Problem

Field service dispatch failures result in costly consequences:
1. **Constraint Breaches**: Sending an HVAC technician to an electrical outage or assigning a job outside an approved region causes wasted truck rolls and angry customers.
2. **Double-Booking & Workload Overburn**: Technicians assigned overlapping time slots or forced beyond daily maximum workload hours leads to burnout, safety violations, and missed SLAs.
3. **Disruption Chaos**: When an emergency emerges at 11:00 AM, re-optimizing the entire day from scratch often erroneously reschedules a job that the technician already completed at 09:30 AM.
4. **Lack of Auditability**: Disagreements between dispatchers and technicians over who authorized a schedule change cannot be resolved without an immutable audit trail and version history.

---

## 4. Proposed Solution

An intelligent, full-stack Field Service Dispatch & Replanning application tailored for a single operating day:
* **Bounded Scope**: Supports a realistic operational unit of 4 technicians and 8–12 service requests.
* **Intelligent Planning Agent**: An LLM agent that ingests candidate technicians, unassigned requests, and operational priorities to generate a structured assignment proposal accompanied by trade-off rationales, risk warnings, and suggested clarification questions.
* **Deterministic Constraint Engine**: A hardened, zero-dependency algorithmic validation layer in TypeScript that rigorously audits every proposed assignment against 7 hard operational constraints before any schedule can be presented as valid.
* **Human-in-the-Loop Approval Workflow**: No schedule modification touches active operations without explicit dispatcher review and authorization.
* **Immutable Versioning & Replanning Engine**: Dynamic recalculation during emergencies or cancellations that freezes completed assignments, tracks exact diffs ("what changed and why"), archives immutable schedule snapshots (v1, v2, ...), and dispatches mocked technician notifications.

```
+----------------------------------------------------------------------------------------------------+
|                                           DISPATCHER                                               |
+----------------------------------------------------------------------------------------------------+
                   |                                                    ^
            1. Requests Plan                                     5. Reviews & Approves
                   v                                                    |
+------------------------------------+               +--------------------------------------+
|          AI Planning Agent         |               |   Deterministic Constraint Engine    |
| (Heuristic Reasoning & Trade-offs) |               | (Rigid 7-Point Hard Rule Validation) |
+------------------------------------+               +--------------------------------------+
                   |                                                    ^
           2. Structured JSON                                  4. Validates Candidate
                   v                                                    |
+----------------------------------------------------------------------------------------------------+
|                                    Draft Schedule Proposal                                         |
+----------------------------------------------------------------------------------------------------+
                                                                        |
                                                               6. Commit Version
                                                                        v
+----------------------------------------------------------------------------------------------------+
|                         Immutable Schedule Version Store & Mock Notification                       |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Core Operational Workflow

1. **Intake & Standby**: Unscheduled service requests and available technician profiles for the target working day (e.g., 08:00 to 17:00) are loaded.
2. **AI Initial Proposal**: The AI agent analyses priorities, skills, and regions to generate a balanced schedule proposal with natural language trade-off summaries.
3. **Deterministic Verification**: The backend validates every proposed assignment against hard constraints. Violations are flagged with precise error codes.
4. **Interactive Dispatcher Review**: The dispatcher inspects the interactive schedule timeline, examines trade-offs, inspects any unassigned requests, and can manually tweak assignments.
5. **Approval & Versioning**: The dispatcher approves the plan. The system creates `Schedule Version 1 (ACTIVE)`, creates audit records, and logs mocked notifications.
6. **Intraday Disruption Handling**:
   * **Scenario A (Emergency Request)**: A critical priority request arrives at 11:00 AM. The AI proposes a replan preempting lower-priority work while strictly locking completed tasks.
   * **Scenario B (Technician Cancellation)**: A technician calls out sick mid-day. Their pending tasks are reclaimed and redistributed to qualified peers with spare capacity.
7. **Diff Inspection & Re-approval**: The UI displays side-by-side diffs (Unchanged, Rescheduled, Reassigned, Unassigned), which the dispatcher approves to commit `Schedule Version 2`.

---

## 6. Project Scope

### In Scope
* Bounded single working day schedule (e.g., standard 8-hour shift, 08:00–17:00).
* 4 Technicians with varied skills (HVAC, Electrical, Plumbing), operating regions (North, South, Central), daily maximum hours, and availability shifts.
* 8–12 Service Requests with explicit priorities (Emergency, High, Medium, Low), required skills, durations, and preferred time windows.
* Deterministic rule engine validating:
  * Skill match
  * Region match
  * Working hours / shift availability
  * Preferred customer time window
  * Overlap / Double-booking prevention
  * Maximum workload limit
  * Completed task immutability
* AI planning agent producing structured JSON with explanations, risk assessments, and clarification questions.
* Interactive visual timeline (Gantt-style) and schedule summary.
* Version preservation (`ScheduleVersion` 1, 2, ...), audit logging, and mocked notification logs.
* Manual override interface with real-time deterministic re-validation.

### Out of Scope (Explicit Non-Requirements)
* Real geospatial maps, live GPS coordinates, or map tiles (Leaflet/Mapbox/Google Maps).
* Real-time road traffic, turn-by-turn routing, or transit matrix calculation APIs.
* Multi-day, weekly, or rotating shift horizons.
* Enterprise fleet management, vehicle telematics, inventory/parts warehouse stock.
* External messaging infrastructure (Twilio SMS, SendGrid email, Push notifications) — mocked in-app logs are sufficient.
* User authentication and RBAC beyond a single simulated Dispatcher session.
* Mobile native applications (iOS/Android).

---

## 7. Assumptions & Technical Constraints

### Assumptions
* **Time Granularity**: Time is modeled in 15-minute or 30-minute blocks within an 8-to-9 hour working day (08:00 to 17:00).
* **Travel Time Model**: Travel is abstracted into regional partitioning (same region = valid; cross-region = invalid or penalized) and fixed standard buffer gaps between assignments rather than dynamic road telemetry.
* **Deterministic Supremacy**: If an AI proposal breaches even one hard constraint, that assignment is marked invalid and cannot be approved until corrected.
* **Dispatcher Authority**: The dispatcher holds absolute decision rights to reject AI proposals, perform manual adjustments, or re-run planning.

### Constraints
* **Development Timeframe**: Architected for a focused 7–10 hour clean implementation.
* **AI Safety**: The LLM prompt must strictly use JSON-schema enforcement and must never write directly to the database or trigger assignment confirmation.
* **Immutability**: Completed assignments must have an immutable state and cannot be deleted, rescheduled, or reassigned by any automated re-plan.

---

## 8. Success Criteria

1. **Safety & Zero Violations**: 100% of confirmed assignments satisfy all 7 deterministic hard constraints. Zero false positives.
2. **Robust Explainability**: The dispatcher receives plain-English rationale for every assignment, explicit flags for unassigned jobs, and actionable warnings for tight time windows.
3. **Seamless Disruption Recovery**: An emergency request or technician cancellation triggers an incremental replan in < 3 seconds that preserves all completed work and clearly highlights schedule diffs.
4. **Audit & Traceability**: Every schedule change, manual override, and approval is persisted with timestamps, actor IDs, and immutable schedule version numbers.
5. **Code Quality & Test Coverage**: Deterministic validation engine tested with 100% unit test coverage for edge cases (boundary overlaps, capacity limits, skill mismatches).
