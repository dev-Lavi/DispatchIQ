# 02 — Requirements Specification: Field Service Dispatch & Replanning Agent

## 1. Overview & Requirements Categorization

This specification outlines the exhaustive set of functional and non-functional requirements for the Field Service Dispatch & Replanning Agent. Requirements are structured with unique identifiers, priority ratings (Must Have [P0], Should Have [P1], Could Have [P2]), and concrete acceptance criteria.

---

## 2. Functional Requirements (FR)

### 2.1 Service Request & Technician Management

| Req ID | Title | Priority | Description | Acceptance Criteria |
| :--- | :--- | :---: | :--- | :--- |
| **FR-01** | Create Service Request | P0 | Dispatcher can create service requests with customer name, location/region, required skill, priority, estimated duration (mins), and preferred time window (`windowStart`, `windowEnd`). | System stores request with status `UNASSIGNED`. Reject invalid time ranges (`windowEnd <= windowStart`). |
| **FR-02** | View & Edit Service Request | P0 | Dispatcher can view all requests and update fields (e.g. adjust duration, change priority, modify time window). | Updates reflect immediately. Completed requests cannot have required skill or duration modified. |
| **FR-03** | Mark Request Status | P0 | System or dispatcher can update request lifecycle status (`UNASSIGNED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`). | Status transitions follow strict state machine. Completed requests become read-only for scheduling. |
| **FR-04** | Create & Configure Technician | P0 | Dispatcher can register technicians with name, assigned region, skill list, shift availability (`shiftStart`, `shiftEnd`), and maximum daily workload (minutes). | System validates non-empty skills, valid time range, and positive workload capacity. |
| **FR-05** | Update Technician Availability | P0 | Dispatcher can mark a technician as unavailable (e.g. sick leave, emergency cancellation) or adjust shift hours. | Triggers recalculation check on active assignments assigned to the technician. |

---

### 2.2 Deterministic Hard Constraint Validation

| Req ID | Title | Priority | Description | Acceptance Criteria |
| :--- | :--- | :---: | :--- | :--- |
| **FR-06** | Validate Required Skill | P0 | Verify technician holds the exact skill required by the service request. | System rejects assignment with `ERR_SKILL_MISMATCH` if technician lacks required skill. |
| **FR-07** | Validate Region Matching | P0 | Verify technician's assigned region matches the request location/region. | System rejects assignment with `ERR_REGION_MISMATCH` if regions do not match. |
| **FR-08** | Validate Shift Availability | P0 | Verify assignment start and end times fall strictly within technician's working hours. | System rejects assignment with `ERR_OUTSIDE_SHIFT` if `start < shiftStart` or `end > shiftEnd`. |
| **FR-09** | Validate Request Time Window | P0 | Verify assignment falls within customer's preferred service window. | System rejects assignment with `ERR_OUTSIDE_WINDOW` if `start < windowStart` or `end > windowEnd`. |
| **FR-10** | Prevent Double-Booking | P0 | Ensure no technician is assigned to two overlapping tasks on the same day. | System rejects assignment with `ERR_DOUBLE_BOOKING` if `(startA < endB) AND (endA > startB)`. |
| **FR-11** | Enforce Maximum Workload | P0 | Ensure total scheduled minutes for a technician do not exceed their daily maximum workload. | System rejects assignment with `ERR_EXCEEDS_MAX_WORKLOAD` if `sum(durations) > maxWorkloadMinutes`. |
| **FR-12** | Protect Completed Assignments | P0 | Prevent any completed or in-progress assignment from being deleted, moved, or reassigned during replanning. | Replan engine locks all assignments with status `COMPLETED` or `IN_PROGRESS`. Attempts to modify return `ERR_COMPLETED_JOB_LOCKED`. |

---

### 2.3 AI Planning Agent & Reasoning

| Req ID | Title | Priority | Description | Acceptance Criteria |
| :--- | :--- | :---: | :--- | :--- |
| **FR-13** | Generate Assignment Proposal | P0 | AI Agent ingests available technicians and unassigned requests to produce a structured candidate schedule. | Output matches strict JSON schema containing proposed assignments, slot times, and rationale. |
| **FR-14** | Explain Assignment Rationale & Trade-offs | P0 | AI Agent provides human-readable explanations detailing why a technician was chosen and trade-offs made. | Every proposed assignment includes `reasoning` (e.g., "Assigned to Alex: minimizes idle gap between 09:00 and 11:00"). |
| **FR-15** | Identify Unassigned Requests | P0 | AI Agent lists requests it could not place, stating the exact operational bottleneck. | Clear reason provided for each unassigned item (e.g., "Insufficient South region HVAC capacity after 14:00"). |
| **FR-16** | Identify Risky Assignments | P1 | AI Agent highlights high-risk assignments (e.g., tight buffer times, end-of-shift deadlines, borderline workload). | Risky assignments flagged with a risk score and explanation banner in the UI. |
| **FR-17** | Suggest Clarification Questions | P1 | AI Agent identifies missing or ambiguous parameters and formulates proactive dispatcher questions. | Generates questions such as "Can Customer #104 accept a 30-min window extension to allow same-day HVAC service?". |

---

### 2.4 Replanning & Disruption Handling

| Req ID | Title | Priority | Description | Acceptance Criteria |
| :--- | :--- | :---: | :--- | :--- |
| **FR-18** | Handle Emergency Work Order | P0 | When an emergency priority request arrives intraday, AI and backend generate an expedited replan. | Preempts lower priority unstarted tasks if capacity is full, while preserving all completed jobs. |
| **FR-19** | Handle Technician Cancellation | P0 | When a technician is marked unavailable, system flags their pending assignments and triggers a replan. | Orphaned tasks are either reassigned to peer technicians with matching skill/capacity or listed as unassigned. |
| **FR-20** | Show Visual Schedule Diff | P0 | When comparing a replan against the active schedule, the system clearly categorizes and highlights changes. | UI explicitly categorizes: `UNCHANGED`, `RESCHEDULED`, `REASSIGNED`, `NEW`, `UNASSIGNED`. |

---

### 2.5 Dispatcher Control, Approval & Auditing

| Req ID | Title | Priority | Description | Acceptance Criteria |
| :--- | :--- | :---: | :--- | :--- |
| **FR-21** | Manual Dispatcher Override | P0 | Dispatcher can manually drag/drop or edit assignment times, reassign technicians, or unassign requests. | All manual adjustments pass through deterministic validation. Violations immediately block commit. |
| **FR-22** | Explicit Schedule Approval | P0 | No proposed schedule becomes active without explicit dispatcher approval. | A dedicated "Approve & Publish Schedule" action commits the draft to an immutable `ScheduleVersion`. |
| **FR-23** | Proposal Rejection | P1 | Dispatcher can reject an AI proposal with a comment or adjustment guidelines. | Rejected proposal archived with reason; active schedule remains untouched. |
| **FR-24** | Schedule Version History | P0 | System maintains an immutable audit log of all schedule versions (v1, v2, ...). | Dispatcher can inspect previous versions, viewing exact assignments and approval metadata at that point in time. |
| **FR-25** | Mocked Dispatch Notifications | P1 | On approval of a new version, system generates mocked technician notifications detailing their updated daily itinerary. | Notification records created in database showing recipient technician, timestamp, change summary, and message payload. |

---

## 3. Non-Functional Requirements (NFR)

### 3.1 Deterministic Independence & Safety
* **NFR-01 (Zero Hallucination Tolerance)**: The deterministic constraint engine must execute in pure code independent of LLM outputs. AI outputs must be treated as untrusted user input and thoroughly parsed and validated.
* **NFR-02 (Atomic Commit)**: Schedule approval and version creation must be an ACID transaction. Either the entire version and its assignments persist, or nothing persists.
* **NFR-03 (Completed Work Immutability)**: Once a service request assignment is marked `COMPLETED` in the database, no automated algorithm or API endpoint may alter its technician, start time, or duration.

### 3.2 Performance & Responsiveness
* **NFR-04 (Validation Latency)**: Deterministic schedule validation for up to 20 assignments across 5 technicians must execute in under **50 milliseconds**.
* **NFR-05 (Replanning Roundtrip)**: Full end-to-end replan workflow (AI prompt execution + JSON parsing + deterministic validation) must complete within **5 seconds**.
* **NFR-06 (UI Rendering)**: Schedule timeline rendering and diff highlighting must operate at a consistent 60 FPS with zero layout thrashing.

### 3.3 Auditability & Traceability
* **NFR-07 (Complete Audit Trail)**: Every mutation (creation, edit, approval, override, cancellation) must log:
  * Entity type & ID
  * Action type (`CREATE`, `UPDATE`, `APPROVE`, `REJECT`, `OVERRIDE`)
  * Actor (`DISPATCHER` or `SYSTEM`)
  * Before-and-after JSON snapshot diff
  * Timestamp (ISO 8601 UTC)

### 3.4 Usability & Human Experience
* **NFR-08 (Decision Transparency)**: At every screen state, the dispatcher must instantly discern:
  1. Active schedule vs. Draft proposal.
  2. Passed vs. Failed constraint checks.
  3. Why an assignment was moved or left unassigned.
* **NFR-09 (Error Clarity)**: Validation errors must present actionable plain-English feedback directly next to the offending assignment block (e.g., *"Carlos does not have the 'Electrical' skill (has: HVAC, Plumbing)"*).

---

## 4. Requirements Traceability Matrix

| Requirement Area | Business Need | Primary Architectural Component | Unit/E2E Test Coverage |
| :--- | :--- | :--- | :--- |
| **FR-01 – FR-05** | Master Data Integrity | CRUD API & Prisma Schemas | Model & Controller Unit Tests |
| **FR-06 – FR-12** | Mathematical Safety | Deterministic Constraint Engine | 100% Deterministic Rule Test Suite |
| **FR-13 – FR-17** | Heuristic Optimization | AI Planning Service + Prompt Engine | Schema & Mock Output Integration Tests |
| **FR-18 – FR-20** | Intraday Resilience | Replan Workflow + Diff Engine | Emergency Replan & Cancellation Scenarios |
| **FR-21 – FR-23** | Dispatcher Supervisory Control | Review UI + Approval Service | E2E Dispatcher Flow Tests |
| **FR-24 – FR-25** | Accountability & Communication | Schedule Versioning + Mock Dispatcher | Audit Log & Notification Tests |
