# 05 — Data Model & Schema Design

## 1. Relational ER Diagram Overview

The data architecture is structured around immutable schedule versioning. When a schedule is modified or replanned, existing versions are never mutated; instead, a new `ScheduleVersion` is instantiated, linking cloned or updated `Assignment` records.

```
+-------------------+           +-----------------------+           +----------------------+
|    Technician     |           |       Schedule        |           |    ServiceRequest    |
+-------------------+           +-----------------------+           +----------------------+
| id (PK)           |           | id (PK)               |           | id (PK)              |
| name              |           | targetDate            |           | customerName         |
| region            |           | status                |           | region               |
| skills (string[]) |           | currentVersionId (FK) |           | requiredSkill        |
| shiftStart        |           +-----------------------+           | priority             |
| shiftEnd          |                       │                       | durationMinutes      |
| maxWorkloadMins   |                       │ 1:N                   | windowStart          |
| isAvailable       |                       ▼                       | windowEnd            |
+-------------------+           +-----------------------+           | status               |
          │                     |    ScheduleVersion    |           +----------------------+
          │                     +-----------------------+                      │
          │                     | id (PK)               |                      │
          │                     | scheduleId (FK)       |                      │
          │                     | versionNumber         |                      │
          │                     | status                |                      │
          │                     | reasoning (text)      |                      │
          │                     | createdBy (actor)     |                      │
          │                     | createdAt             |                      │
          │                     +-----------------------+                      │
          │                                 │                                  │
          │ 1:N                             │ 1:N                              │ 1:N
          ▼                                 ▼                                  ▼
+--------------------------------------------------------------------------------------+
|                                     Assignment                                       |
+--------------------------------------------------------------------------------------+
| id (PK)                                                                              |
| scheduleVersionId (FK -> ScheduleVersion.id)                                         |
| serviceRequestId  (FK -> ServiceRequest.id)                                          |
| technicianId      (FK -> Technician.id)                                              |
| startTime         (string / DateTime)                                                |
| endTime           (string / DateTime)                                                |
| durationMinutes   (integer)                                                          |
| status            (Enum: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)               |
| isManualOverride  (boolean)                                                          |
| overrideReason    (string, optional)                                                 |
| lockState         (Enum: UNLOCKED, LOCKED_COMPLETED, LOCKED_IN_PROGRESS)             |
+--------------------------------------------------------------------------------------+
          │                                                                 │
          │ 1:N                                                             │ 1:N
          ▼                                                                 ▼
+------------------------------------+             +-----------------------------------+
|              Approval              |             |            Notification           |
+------------------------------------+             +-----------------------------------+
| id (PK)                            |             | id (PK)                           |
| scheduleVersionId (FK)             |             | technicianId (FK)                 |
| decision (APPROVED / REJECTED)     |             | scheduleVersionId (FK)            |
| approvedBy                         |             | channel (MOCK_SMS / MOCK_PUSH)   |
| notes                              |             | title                             |
| createdAt                          |             | messagePayload                    |
+------------------------------------+             | sentAt                            |
                                                   +-----------------------------------+
                                                                    │
+------------------------------------+                              │
|              AuditLog              |                              │
+------------------------------------+                              │
| id (PK)                            |                              │
| entityType (SCHEDULE, ASSIGN, etc) |                              │
| entityId                           |                              │
| action (CREATE, UPDATE, APPROVE...)│                              │
| actor (DISPATCHER, AI_AGENT, SYSTEM│                              │
| changeDiff (JSONB / text)          |                              │
| createdAt                          |                              │
+------------------------------------+                              │
```

---

## 2. Entity Definitions

### 2.1 Technician (`technicians`)
Represents qualified field personnel available for daily dispatch.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Unique technician identifier |
| `name` | `String` | Required | Full name (e.g. "Carlos Rivera") |
| `region` | `String` | Required | Assigned operating territory (`North`, `South`, `Central`) |
| `skills` | `String[]` (JSON / Array) | Required | List of certified skills (e.g. `["HVAC", "Plumbing"]`) |
| `shiftStart` | `String` | Required | Beginning of work shift (e.g. `"08:00"`) |
| `shiftEnd` | `String` | Required | End of work shift (e.g. `"17:00"`) |
| `maxWorkloadMinutes`| `Int` | Required | Maximum billable work minutes per day (e.g. `420` = 7 hrs) |
| `isAvailable` | `Boolean` | Required, Default: `true` | Set to `false` during sickness or emergency call-outs |
| `createdAt` | `DateTime` | Required, Default: `now()` | Record creation timestamp |
| `updatedAt` | `DateTime` | Required, Auto-update | Record update timestamp |

**Indexes**:
* `@@index([region, isAvailable])` — Fast lookup for eligible candidates during planning.

---

### 2.2 ServiceRequest (`service_requests`)
Represents customer work orders requiring dispatch on the operating date.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Unique service request identifier (e.g. `"SR-101"`) |
| `customerName` | `String` | Required | Customer name or site title (e.g. `"Apex Medical Center"`) |
| `region` | `String` | Required | Job site territory (`North`, `South`, `Central`) |
| `requiredSkill` | `String` | Required | Skill needed (`HVAC`, `Electrical`, `Plumbing`) |
| `priority` | `Enum: Priority` | Required | `EMERGENCY`, `HIGH`, `MEDIUM`, `LOW` |
| `durationMinutes` | `Int` | Required | Estimated job duration in minutes (e.g. `60`, `90`, `120`) |
| `windowStart` | `String` | Required | Earliest customer arrival time (e.g. `"09:00"`) |
| `windowEnd` | `String` | Required | Latest acceptable finish time (e.g. `"13:00"`) |
| `status` | `Enum: RequestStatus` | Required | `UNASSIGNED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `targetDate` | `String` | Required | Working day date string (e.g. `"2026-10-15"`) |
| `createdAt` | `DateTime` | Required, Default: `now()` | Timestamp created |
| `updatedAt` | `DateTime` | Required, Auto-update | Timestamp updated |

**Indexes**:
* `@@index([targetDate, status])`
* `@@index([region, requiredSkill])`

---

### 2.3 Schedule (`schedules`)
Represents the operational container for a specific calendar day.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Primary schedule identifier |
| `targetDate` | `String` | Unique, Required | ISO date string (`"YYYY-MM-DD"`) |
| `status` | `Enum: ScheduleStatus` | Required | `DRAFT`, `ACTIVE`, `ARCHIVED` |
| `currentVersionId`| `String?` | Optional, FK | Pointer to the active approved `ScheduleVersion` |
| `createdAt` | `DateTime` | Required, Default: `now()` | Initial creation date |
| `updatedAt` | `DateTime` | Required, Auto-update | Last modification date |

---

### 2.4 ScheduleVersion (`schedule_versions`)
Immutable historical snapshots of daily plans. Every approval or major replan yields a new sequential version.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Unique version identifier |
| `scheduleId` | `String` | Required, FK -> `Schedule.id` | Associated schedule container |
| `versionNumber` | `Int` | Required | Sequential counter (`1`, `2`, `3`...) |
| `status` | `Enum: VersionStatus` | Required | `PROPOSED`, `APPROVED`, `SUPERSEDED`, `REJECTED` |
| `triggerReason` | `String` | Required | Context (e.g. `"INITIAL_GENERATION"`, `"EMERGENCY_REPLAN"`) |
| `summary` | `String` | Required | AI-generated or system summary of the plan |
| `tradeOffs` | `String[]` (JSON) | Required | Documented trade-offs made in this proposal |
| `risks` | `String[]` (JSON) | Required | Flagged operational risks (e.g. tight buffers) |
| `unassignedNotes`| `String[]` (JSON) | Required | Explanations for any unplaced service requests |
| `clarificationQuestions` | `String[]` (JSON) | Optional | Questions suggested by the AI for dispatchers |
| `createdBy` | `String` | Required | `"AI_AGENT"`, `"DISPATCHER"`, or `"SYSTEM"` |
| `createdAt` | `DateTime` | Required, Default: `now()` | Exact creation timestamp |

**Indexes**:
* `@@unique([scheduleId, versionNumber])`
* `@@index([scheduleId, status])`

---

### 2.5 Assignment (`assignments`)
The concrete assignment of a service request to a technician at a specific time slot within a specific schedule version.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Unique assignment identifier |
| `scheduleVersionId` | `String` | Required, FK -> `ScheduleVersion.id` | Parent schedule version snapshot |
| `serviceRequestId` | `String` | Required, FK -> `ServiceRequest.id` | Service request assigned |
| `technicianId` | `String` | Required, FK -> `Technician.id` | Assigned field technician |
| `startTime` | `String` | Required | Scheduled start (e.g. `"09:00"`) |
| `endTime` | `String` | Required | Scheduled end (e.g. `"10:30"`) |
| `durationMinutes` | `Int` | Required | Scheduled duration in minutes |
| `status` | `Enum: AssignmentStatus` | Required | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `lockState` | `Enum: LockState` | Required | `UNLOCKED`, `LOCKED_COMPLETED`, `LOCKED_IN_PROGRESS` |
| `isManualOverride`| `Boolean` | Required, Default: `false` | True if manually placed or altered by dispatcher |
| `overrideReason` | `String?` | Optional | Reason provided for manual change |
| `assignedBy` | `String` | Required | `"AI_AGENT"` or `"DISPATCHER"` |

**Indexes**:
* `@@index([scheduleVersionId, technicianId])`
* `@@index([scheduleVersionId, serviceRequestId])`

---

### 2.6 Approval (`approvals`)
Captures the formal human sign-off on a schedule proposal.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Unique approval identifier |
| `scheduleVersionId` | `String` | Required, FK -> `ScheduleVersion.id` | Version reviewed |
| `decision` | `Enum: ApprovalDecision` | Required | `APPROVED`, `REJECTED` |
| `approvedBy` | `String` | Required | Dispatcher identifier/name |
| `notes` | `String?` | Optional | Dispatcher review commentary |
| `createdAt` | `DateTime` | Required, Default: `now()` | Decision timestamp |

---

### 2.7 AuditLog (`audit_logs`)
Append-only historical ledger capturing every operational mutation.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Unique audit log ID |
| `entityType` | `String` | Required | `"SCHEDULE"`, `"VERSION"`, `"ASSIGNMENT"`, `"REQUEST"` |
| `entityId` | `String` | Required | Primary key of affected entity |
| `action` | `String` | Required | `"PROPOSAL_GENERATED"`, `"APPROVED"`, `"OVERRIDE"`, `"REPLAN"` |
| `actor` | `String` | Required | `"DISPATCHER"`, `"AI_AGENT"`, `"SYSTEM"` |
| `changeDiff` | `JSON` | Required | Structured diff showing `{ before, after }` state |
| `createdAt` | `DateTime` | Required, Default: `now()` | Timestamp of action |

---

### 2.8 Notification (`notifications`)
Simulated operational dispatches dispatched to technicians.

| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID/CUID) | PK, Required | Unique notification ID |
| `technicianId` | `String` | Required, FK -> `Technician.id` | Recipient technician |
| `scheduleVersionId` | `String` | Required, FK -> `ScheduleVersion.id` | Triggering schedule version |
| `channel` | `Enum: NotifChannel` | Required | `MOCK_SMS`, `MOCK_PUSH` |
| `title` | `String` | Required | Subject line (e.g. `"Schedule Updated: Version 2 Activated"`) |
| `messagePayload` | `String` | Required | Formatted itinerary summary |
| `status` | `String` | Required, Default: `"DELIVERED"` | Mock delivery status |
| `sentAt` | `DateTime` | Required, Default: `now()` | Dispatch timestamp |

---

## 3. Immutability & Completed Assignment Protection

### 3.1 Version Snapshotting Strategy
When a schedule changes (via AI replanning or manual override):
1. The currently active `ScheduleVersion` is marked `SUPERSEDED`.
2. A new `ScheduleVersion` row is created with `versionNumber = previousVersion + 1`.
3. Assignments from the previous version are copied forward:
   * Any assignment with `status: 'COMPLETED'` or `status: 'IN_PROGRESS'` is copied verbatim with `lockState: LOCKED_COMPLETED` or `LOCKED_IN_PROGRESS`.
   * Pending/scheduled assignments are adjusted per the new plan.
4. If the dispatcher approves, `Schedule.currentVersionId` is updated atomically to point to the new version.

### 3.2 Completed Task Defense in Replan
```typescript
// Architectural invariant: Completed tasks cannot be moved
if (existingAssignment.status === 'COMPLETED' || existingAssignment.status === 'IN_PROGRESS') {
  candidateAssignment.technicianId = existingAssignment.technicianId;
  candidateAssignment.startTime = existingAssignment.startTime;
  candidateAssignment.endTime = existingAssignment.endTime;
  candidateAssignment.lockState = 'LOCKED_COMPLETED';
}
```
Any proposal or manual override attempting to shift `startTime`, change `technicianId`, or delete a locked assignment will fail deterministic rule `validateCompletedAssignment()` with an unrecoverable validation error.
