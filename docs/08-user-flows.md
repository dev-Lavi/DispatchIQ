# 08 — User Workflows & Dispatcher Journeys

## 1. Overview of Core Dispatch Journeys

Field service dispatching operates in cycles of planning, execution, monitoring, and disruption recovery. The application models five primary user flows that provide seamless control while guaranteeing constraint compliance.

```
                    +------------------------------------+
                    |       DAILY DISPATCH WORKFLOWS     |
                    +------------------------------------+
                                      │
         ┌────────────────────────────┼───────────────────────────┐
         │                            │                           │
         ▼                            ▼                           ▼
[ Flow 1: Initial Plan ]   [ Flow 2: Manual Override ]  [ Flow 3: Emergency Ingestion ]
         │                            │                           │
         └────────────────────────────┼───────────────────────────┘
                                      │
                         ┌────────────┴───────────┐
                         ▼                        ▼
           [ Flow 4: Tech Cancellation ] [ Flow 5: Proposal Rejection ]
```

---

## 2. Flow 1: Initial Schedule Generation & Baseline Approval

* **Goal**: Establish the initial baseline operational schedule (Version 1) for the working day.
* **Preconditions**: Available technician roster and unassigned service requests are loaded.

```
+----------------------------------------------------------------------------------------------------+
|  STEP 1: Intake Review                                                                             |
|  Dispatcher navigates to /dashboard and reviews 10 pending requests and 4 available technicians.   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 2: Trigger AI Generation                                                                     |
|  Dispatcher clicks "Generate Optimal Schedule Plan". API initiates AI agent with prompt context.  |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 3: Schema Validation & Deterministic Verification                                            |
|  AI returns structured JSON. Backend validates with Zod, then executes 7 hard constraint checks.   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 4: Dispatcher Inspection                                                                     |
|  Dispatcher views proposed Gantt timeline, reviews AI rationale drawer, checks unassigned tickets,  |
|  and verifies that all constraint badges display "PASSED (7/7)".                                   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 5: Explicit Approval & Activation                                                            |
|  Dispatcher clicks "Approve & Publish Schedule". System commits Schedule Version 1,                |
|  creates audit log, and generates mock dispatch notifications for all 4 technicians.               |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Flow 2: Manual Assignment Modification (Dispatcher Override)

* **Goal**: Dispatcher adjusts an individual assignment based on local domain knowledge not captured by the system.
* **Preconditions**: Schedule Version 1 is active. Target assignment is in `SCHEDULED` status (not `COMPLETED`).

```
+----------------------------------------------------------------------------------------------------+
|  STEP 1: Select Assignment Block                                                                   |
|  Dispatcher clicks on Assignment SR-103 on Carlos's timeline. An "Edit Assignment" modal opens.    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 2: Dispatcher Modifies Parameters                                                            |
|  Dispatcher shifts start time from 10:00 to 11:00 and enters Override Reason: "Customer requested  |
|  30-min gate code delay."                                                                          |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 3: Real-Time Deterministic Guardrail Check                                                   |
|  Backend validates the shift against Carlos's shift end, max workload, and subsequent assignments.  |
|  - If valid: Save button enables with green check.                                                 |
|  - If invalid: Error banner displays (e.g. "ERR_DOUBLE_BOOKING with SR-106 at 11:30").              |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 4: Commit Override & Create Schedule Version 2                                               |
|  On confirmation, system increments schedule version (v2), flags `isManualOverride: true`, logs   |
|  the audit trail with the dispatcher's reason, and alerts Carlos via mock notification.            |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Flow 3: Emergency Service Request Intake & Replan

* **Goal**: Accommodate a critical priority emergency request intraday without disrupting completed work or violating hard constraints.
* **Preconditions**: Active schedule version has tasks already marked `COMPLETED` at 11:00 AM.

```
+----------------------------------------------------------------------------------------------------+
|  STEP 1: Ingest Emergency Ticket                                                                   |
|  Dispatcher creates emergency request: "Gas Leak - Commercial Kitchen" (Region: North, Priority:   |
|  EMERGENCY, Skill: Plumbing, Duration: 60m, Window: 11:30-13:00).                                 |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 2: Trigger AI Disruption Replan                                                              |
|  System locks completed tasks and queries AI agent to insert emergency job with minimal churn.     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 3: Deterministic Constraint Audit                                                            |
|  Engine confirms all completed tasks remain in place and no double-booking occurs.                 |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 4: Visual Diff Review ("What Changed & Why")                                                 |
|  UI opens "Schedule Version Diff" drawer:                                                          |
|  - LOCKED (Completed): SR-101 (09:00-10:30, Alex) - Unchanged                                      |
|  - NEW: SR-109 Emergency (11:30-12:30, Alex) - Inserted                                            |
|  - RESCHEDULED: SR-104 (13:00-14:30 -> 14:30-16:00, Alex) - Shifted to make room                   |
|  - UNASSIGNED: SR-107 (Low priority inspection deferred due to capacity cap)                       |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 5: Dispatcher Approval                                                                       |
|  Dispatcher verifies the operational compromise and clicks "Approve Replanned Schedule".           |
|  Schedule Version 3 is activated; affected technicians receive push notifications.                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Flow 4: Technician Mid-Day Cancellation

* **Goal**: Reallocate work when a technician calls out sick or experiences vehicle breakdown.
* **Preconditions**: Schedule is active. Technician David has 1 completed job and 2 pending jobs.

```
+----------------------------------------------------------------------------------------------------+
|  STEP 1: Mark Technician Unavailable                                                               |
|  Dispatcher toggles Technician David's status to "Unavailable / Called Out".                       |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 2: System Identifies Orphaned Assignments                                                    |
|  - Task 1 (08:30-10:00, COMPLETED): Permanently locked to David's historical record.               |
|  - Tasks 2 & 3 (PENDING): Extracted into the unassigned replan pool.                               |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 3: AI Candidate Redistribution                                                               |
|  AI evaluates surviving technicians in David's region with matching skills and workload capacity.   |
|  Proposes assigning Task 2 to Technician Maria and moving Task 3 to Unassigned due to capacity.    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 4: Review, Approval & Notification Dispatch                                                  |
|  Dispatcher approves replan. New version published. Maria receives notification of added job;      |
|  David receives notification that pending tasks were retracted.                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 6. Flow 5: AI Proposal Rejection & Feedback Loop

* **Goal**: Dispatcher rejects an unsatisfactory AI plan and guides generation towards an acceptable alternative.
* **Preconditions**: A generated proposal draft is pending review.

```
+----------------------------------------------------------------------------------------------------+
|  STEP 1: Dispatcher Reviews Proposal                                                               |
|  Dispatcher notes that AI left a key VIP customer unassigned to avoid a 15-minute gap.              |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 2: Click "Reject Proposal"                                                                   |
|  Dispatcher enters feedback: "Prioritize VIP Client SR-106 over SR-102 even if workload is high."  |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 3: Status Archival & Feedback Logging                                                        |
|  Proposal status transitions to REJECTED with feedback logged in the audit trail.                  |
|  Active operational schedule remains completely unaffected.                                        |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|  STEP 4: Regenerate with Guidelines                                                                |
|  Dispatcher clicks "Regenerate with Notes". System re-queries AI agent with the added guideline.   |
+----------------------------------------------------------------------------------------------------+
```
