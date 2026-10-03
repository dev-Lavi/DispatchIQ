# 10 — UI/UX Design & Dispatcher Control Center

## 1. UI Design Philosophy & Core Tenets

The dispatch control center is engineered for high operational clarity under pressure. A dispatcher should never feel lost, confused about what version is active, or uncertain whether an assignment violates a rule.

### The 7 Core Dispatcher Questions
At any instant, the UI guarantees clear answers to:
1. **What is currently scheduled?** ➔ Visual Gantt timeline representing the active `ScheduleVersion`.
2. **What did the AI propose?** ➔ Side-by-side or overlay comparison with candidate assignment cards.
3. **What is invalid?** ➔ Prominent red violation badges directly attached to offending blocks with plain-English tooltips.
4. **What changed?** ➔ Color-coded diff badges (`UNCHANGED`, `RESCHEDULED`, `REASSIGNED`, `NEW`, `UNASSIGNED`).
5. **Why did it change?** ➔ Plain-text reasoning pills explaining trade-offs and emergency preemption rationales.
6. **Who approved it?** ➔ Header version badge displaying approver name and timestamp (e.g. *"Approved by Dispatcher Sarah at 08:15"*).
7. **Which version am I viewing?** ➔ Persistent version switcher breadcrumb (e.g. `Viewing: Version 2 (Active) | Compare with v1`).

---

## 2. Layout Structure & Navigation

A high-density desktop application layout optimized for 1440px+ displays:

```
+----------------------------------------------------------------------------------------------------+
| [LOGO] FieldOps Dispatcher AI   | Target Day: [ 2026-10-15 v ] | Status: [ ACTIVE v2 ] | [Sarah (D)]|
+----------------------------------------------------------------------------------------------------+
| NAV: [ Dashboard ]  [ Schedule Timeline ]  [ Work Orders (10) ]  [ Technicians (4) ]  [ Audit Logs ]|
+----------------------------------------------------------------------------------------------------+
|                                              |                                                     |
|           LEFT & CENTER: SCHEDULE TIMELINE   |            RIGHT: AI COPILOT & PROPOSAL             |
|                                              |                                                     |
| [ + Emergency Order ] [ Replan Day ] [Diff]  | [ AI Status: Proposal Ready (7/7 Passed) ]          |
|                                              | --------------------------------------------------- |
| Time:  08:00  09:00  10:00  11:00 ... 17:00  | Plan Summary:                                       |
|                                              | "Balanced 9 requests. Kept 15m travel buffers."     |
| [Carlos R.] [SR-101: HVAC] [SR-103: Plumb]   |                                                     |
| (North)     [========]     [==========]      | Trade-offs & Rationale:                             |
|                                              | * Carlos handles morning North HVAC calls.          |
| [Maria S.]        [SR-102: Elect] [SR-105]   | * SR-108 unassigned: North tech hours capped.       |
| (South)           [=============] [======]   |                                                     |
|                                              | Operational Risks:                                  |
| [David K.]  [SR-104: HVAC - COMPLETED (L)]   | ! Tight buffer (15m) for Maria at 12:00.            |
| (Central)   [============================]   |                                                     |
|                                              | Questions for Dispatcher:                           |
| [Elena V.]        [SR-109: Emergency Gas]    | ? Can SR-108 be rescheduled to tomorrow?           |
| (North)           [=====================]    | --------------------------------------------------- |
|                                              | [ Reject Proposal ]       [ Approve & Publish (v3) ]|
+----------------------------------------------------------------------------------------------------+
| BOTTOM DRAWER: Unassigned Backlog (1) | Notifications Log (4) | Active Constraints Check: ALL PASS |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Screen Specifications

### 3.1 Primary Screen: `/dashboard` (Dispatch Command Center)
* **Header Bar**:
  * Date selector with quick buttons (Today, Tomorrow).
  * Active Schedule Version badge (`Version 2 - ACTIVE`).
  * Action controls: `+ New Emergency Request`, `Generate AI Plan`, `Technician Call-out`.
* **Central Interactive Gantt Timeline**:
  * Horizontal time axis from `08:00` to `17:00` with 30-minute grid increments and current time indicator (red vertical line).
  * Rows grouped by Technician with metadata (Name, Region, Skills pills, Workload progress bar `5.5h / 7h`).
  * Assignment Blocks:
    * Color-coded by status: Blue (`SCHEDULED`), Amber (`IN_PROGRESS`), Green with lock icon (`COMPLETED`), Red dashed (`COLLISION / INVALID`).
    * Click opens Assignment Detail & Override Drawer.
* **Right Panel: AI Planning & Verification Copilot**:
  * Proposal summary accordion.
  * Deterministic validation scorecard (7/7 Hard Rules Passed).
  * Operational risks callouts with warning badges.
  * Clarification questions suggestions.
  * Primary CTA: `Approve & Activate Schedule` or `Reject Proposal`.

### 3.2 `/schedule` & `/schedule/:id` (Timeline & Version Comparator)
* **Version Diff Mode**:
  * Toggle between `Split View` and `Unified Diff View`.
  * Highlight changed blocks:
    * Yellow with curved arrow: `RESCHEDULED` (Time shifted).
    * Purple with user icon: `REASSIGNED` (Moved to different technician).
    * Green with plus badge: `NEW` (Emergency job inserted).
    * Muted gray with padlock: `LOCKED_COMPLETED` (Completed task preserved).
* **Manual Override Modal**:
  * Select target technician, start time, end time.
  * Live validation feedback: Shows real-time check against skills, availability, and double-booking before submission.

### 3.3 `/requests` (Service Request Backlog)
* High-density data table displaying all customer work orders for the target date.
* Columns: Priority badge (`EMERGENCY`, `HIGH`, `MEDIUM`, `LOW`), Customer Name, Region, Required Skill, Duration, Time Window, Status.
* Quick filters: `Show Unassigned Only`, `Filter by Region`, `Filter by Skill`.
* Action: Drag request directly onto timeline or click `Auto-Assign`.

### 3.4 `/technicians` (Fleet Roster & Status)
* Technician status cards showing real-time daily metrics:
  * Name, Photo avatar, Region badge.
  * Certified skills tags.
  * Workload utilization dial (e.g. `360 / 420 mins - 85%`).
  * Availability toggle: Switch between `Available` and `Called Out / Sick`.
  * Triggering call-out immediately initiates the disruption replan flow.

### 3.5 `/audit-log` (Accountability & Historical Ledger)
* Full audit trail table:
  * Timestamp (Local & UTC).
  * Actor badge: `[DISPATCHER: Sarah]` or `[AI_AGENT: gemini-1.5-flash]`.
  * Action type: `PROPOSAL_GENERATED`, `VERSION_APPROVED`, `MANUAL_OVERRIDE`, `REPLAN_EMERGENCY`.
  * Expandable JSON diff modal showing exact before/after field mutations.

---

## 4. Component Design System & Visual Hierarchy

### 4.1 Status Badges & Color Palette
* **Priority**:
  * `EMERGENCY`: Rose-600 background, pulsating red dot.
  * `HIGH`: Amber-500 badge.
  * `MEDIUM`: Blue-500 badge.
  * `LOW`: Slate-400 badge.
* **Assignment Lifecycle**:
  * `SCHEDULED`: Border solid blue-500, bg-blue-50/10.
  * `IN_PROGRESS`: Amber-500 pulse, bg-amber-50/20.
  * `COMPLETED`: Slate-700 bg, emerald checkmark, locked icon.
  * `INVALID / OVERLAP`: Red-500 diagonal stripe border with alert icon.

### 4.2 Constraint Violation Callout Box
When an assignment fails validation, it renders an un-dismissible warning card:
```
+---------------------------------------------------------------------------+
| [!] 2 HARD CONSTRAINT VIOLATIONS DETECTED                                 |
+---------------------------------------------------------------------------+
| * ERR_SKILL_MISMATCH: David Kim does not possess 'HVAC' certification.   |
|   Available certifications: [Electrical, Plumbing]                        |
| * ERR_OUTSIDE_WINDOW: Scheduled 14:00-15:30 ends after customer window    |
|   closes at 15:00.                                                        |
+---------------------------------------------------------------------------+
| ACTION REQUIRED: Reassign to an HVAC certified technician or adjust time. |
+---------------------------------------------------------------------------+
```

### 4.3 Mock Notification Drawer
A floating notification feed simulating SMS/Push dispatch updates:
* *"Technician Carlos Rivera: Your route was updated for Schedule v2. Job SR-103 added at 11:30."*
* *"Technician David Kim: Schedule updated. You have been relieved of remaining pending assignments."*
