# 12 — End-to-End Demonstration Scenario & Seed Dataset

## 1. Demo Scenario Overview

This demonstration showcases how the **Field Service Dispatch & Replanning Agent** handles initial day-of-service optimization, enforces strict deterministic constraint safety, and navigates intraday disruptions with immutable versioning and completed job preservation.

* **Target Operating Day**: October 15, 2026 (08:00 to 17:00)
* **Technician Fleet**: 4 Technicians across 3 Regions
* **Work Order Demand**: 10 Baseline Service Requests + 1 Intraday Emergency Request

---

## 2. Seed Master Data

### 2.1 Technician Roster (4 Field Technicians)

| ID | Name | Region | Certified Skills | Shift Hours | Max Daily Workload | Status |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: |
| `TECH-01` | **Carlos Rivera** | North | `HVAC`, `Plumbing` | 08:00 – 17:00 | 420 mins (7.0 hrs) | Available |
| `TECH-02` | **Maria Santos** | South | `Electrical`, `HVAC` | 08:30 – 16:30 | 390 mins (6.5 hrs) | Available |
| `TECH-03` | **David Kim** | Central | `Plumbing`, `Electrical`| 08:00 – 16:00 | 360 mins (6.0 hrs) | Available |
| `TECH-04` | **Elena Vance** | North | `Electrical` | 09:00 – 17:00 | 360 mins (6.0 hrs) | Available |

---

### 2.2 Baseline Service Requests (10 Customer Work Orders)

| ID | Customer Site | Region | Required Skill | Priority | Duration | Customer Window | Expected Assignment |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `SR-101` | **Metro Health Clinic** | North | `HVAC` | **HIGH** | 90 mins | 08:30 – 11:30 | Carlos (08:30 – 10:00) |
| `SR-102` | **Harbor Light Plaza** | South | `Electrical` | **HIGH** | 120 mins | 09:00 – 12:00 | Maria (09:00 – 11:00) |
| `SR-103` | **Northside School** | North | `Plumbing` | **MEDIUM** | 60 mins | 10:30 – 13:00 | Carlos (10:30 – 11:30) |
| `SR-104` | **Civic Center** | Central | `Plumbing` | **HIGH** | 90 mins | 08:30 – 12:00 | David (08:30 – 10:00) |
| `SR-105` | **South Bay Retail** | South | `HVAC` | **MEDIUM** | 90 mins | 11:30 – 15:00 | Maria (11:30 – 13:00) |
| `SR-106` | **Downtown Lofts** | Central | `Electrical` | **MEDIUM** | 90 mins | 10:30 – 14:00 | David (10:30 – 12:00) |
| `SR-107` | **Oakridge Tech Park** | North | `Electrical` | **HIGH** | 90 mins | 09:30 – 13:00 | Elena (09:30 – 11:00) |
| `SR-108` | **Valley Logistics Hub** | North | `Electrical` | **LOW** | 120 mins | 13:00 – 16:30 | Elena (13:00 – 15:00) |
| `SR-109` | **Lakeside Apartments** | Central | `Plumbing` | **LOW** | 60 mins | 13:00 – 15:30 | David (13:00 – 14:00) |
| `SR-110` | **North Hills Complex** | North | `HVAC` | **LOW** | 150 mins | 13:00 – 16:00 | **UNASSIGNABLE (Capacity bottleneck)** |

> **Key Scenario Note on SR-110**: Carlos has only 270 mins left after SR-101 and SR-103, but SR-110 requires 150 mins within 13:00–16:00 and another potential conflict or capacity constraint limits his shift. Demonstrates the system's ability to intelligently flag unassignable requests with explicit operational root causes.

---

### 2.3 The Intraday Disruption (Emergency Request)

| ID | Customer Site | Region | Required Skill | Priority | Duration | Customer Window | Disruption Timing |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `SR-111` | **St. Jude Hospital ICU** | North | `Plumbing` | **EMERGENCY** | 60 mins | 11:00 – 13:00 | Arrives at 10:45 AM |

---

## 3. Step-by-Step Live Demonstration Script

### Step 1: Initial System State & Request Backlog
* **Action**: Dispatcher opens `http://localhost:5173/dashboard`.
* **Visual**:
  * Date banner displays `Thursday, Oct 15, 2026`.
  * Status displays `NO ACTIVE SCHEDULE — 10 Unassigned Work Orders`.
  * Technician roster displays all 4 technicians with 0 hours booked.

---

### Step 2: Trigger AI Plan & Review Rationale
* **Action**: Dispatcher clicks **"Generate Optimal Schedule Plan"**.
* **System Event**: AI Agent processes the dataset, constructs candidate slots, evaluates soft trade-offs, and returns structured JSON.
* **Visual**: AI Copilot Drawer slides open:
  * **Plan Summary**: *"Assigned 9 of 10 requests across 4 technicians. Preserved 30-minute travel buffers between calls."*
  * **Trade-off Insights**:
    * *"Carlos Rivera given morning North HVAC and Plumbing jobs to minimize travel."*
    * *"SR-110 (150 mins) left unassigned to avoid exceeding Carlos's 420-minute daily maximum workload."*
  * **Clarification Question**: *"Can North Hills Complex (SR-110) split their 150-minute inspection into two separate visits or reschedule to tomorrow?"*

---

### Step 3: Deterministic Validation Verification
* **Visual**: Above the timeline, the **Deterministic Validation Scorecard** lights up in green:
  * `[✓] Required Skills Match: 9/9 Valid`
  * `[✓] Regional Territories: 9/9 Match`
  * `[✓] Technician Shift Boundaries: 9/9 Within Range`
  * `[✓] Customer Service Windows: 9/9 Within Window`
  * `[✓] Double-Booking / Overlap: 0 Collisions Detected`
  * `[✓] Daily Workload Limits: All Technicians Within Quota`

---

### Step 4: Dispatcher Approval & Version 1 Activation
* **Action**: Dispatcher clicks **"Approve & Publish Schedule"**.
* **System Event**:
  * Transaction commits `ScheduleVersion 1 (ACTIVE)`.
  * Clones 9 assignments with `isManualOverride: false`.
  * Emits simulated Push/SMS dispatch notifications.
* **Visual**:
  * Notification panel logs 4 items: *"Itinerary dispatched to Carlos, Maria, David, Elena."*
  * Header updates to: `ACTIVE — Schedule Version 1 (Approved by Dispatcher at 08:00)`.

---

### Step 5: Day Progress & Assignment Execution
* **Simulation Action**: At 10:45 AM, Dispatcher marks:
  * `SR-101` (Carlos, 08:30–10:00) as **`COMPLETED`**.
  * `SR-104` (David, 08:30–10:00) as **`COMPLETED`**.
* **Visual**:
  * SR-101 and SR-104 on the timeline turn dark slate with a green checkmark and a **Padlock Icon** (`LOCKED_COMPLETED`).

---

### Step 6: Intraday Disruption — Emergency Gas/Plumbing Leak
* **Action**: Dispatcher clicks **"+ New Emergency Work Order"**:
  * Enters `SR-111`: *"St. Jude Hospital ICU"*, Region: `"North"`, Skill: `"Plumbing"`, Priority: `"EMERGENCY"`, Duration: `60m`, Window: `"11:00 - 13:00"`.
* **System Conflict**:
  * In the North region, only Carlos has the `Plumbing` skill.
  * Carlos has already completed SR-101.
  * Carlos is currently scheduled for routine job `SR-103` from `10:30–11:30`.

---

### Step 7: Automated Replan with Completed Task Lock
* **Action**: Dispatcher clicks **"Generate Disruption Replan"**.
* **System Event**:
  * System passes locked task `SR-101` to AI and constraint engine.
  * AI recognizes `SR-101` is immutable and cannot be touched.
  * AI preempts routine job `SR-103`, slots emergency `SR-111` for Carlos from `11:00–12:00`, and pushes `SR-103` to `13:30–14:30`.
* **Visual: Version Diff Drawer**:
  * **LOCKED / UNCHANGED**: `SR-101` (08:30–10:00, Carlos) — *Protected (Already Completed)*.
  * **NEW ASSIGNMENT**: `SR-111` (11:00–12:00, Carlos) — *Emergency Job inserted*.
  * **RESCHEDULED**: `SR-103` shifted from `10:30` to `13:30` on Carlos.
  * **UNASSIGNED**: `SR-110` remains unassigned.
  * **Explanation**: *"Emergency priority work order SR-111 inserted. Locked job SR-101 preserved intact."*

---

### Step 8: Dispatcher Approves Schedule Version 2
* **Action**: Dispatcher clicks **"Approve Replanned Schedule"**.
* **System Event**:
  * Creates `ScheduleVersion 2 (ACTIVE)`.
  * Version 1 marked `SUPERSEDED`.
  * Emits simulated SMS to Carlos: *"URGENT: Emergency call SR-111 assigned at 11:00. Job SR-103 moved to 13:30."*
* **Visual**: Header updates to `ACTIVE — Schedule Version 2`.

---

### Step 9: Inspection of Complete Audit Trail
* **Action**: Dispatcher clicks the **"Audit Trail"** tab.
* **Visual**: Full chronological ledger:
  1. `08:00:00` — `PROPOSAL_GENERATED` (Version 1 proposed by AI Agent).
  2. `08:02:15` — `VERSION_APPROVED` (Version 1 approved by Dispatcher).
  3. `10:05:00` — `STATUS_UPDATE` (SR-101 marked COMPLETED).
  4. `10:45:00` — `EMERGENCY_INGESTED` (SR-111 created).
  5. `10:46:10` — `REPLAN_GENERATED` (Version 2 proposal created with 1 shift, 1 new).
  6. `10:47:00` — `VERSION_APPROVED` (Version 2 approved by Dispatcher).
