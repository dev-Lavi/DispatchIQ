# 09 — REST API Specification

## 1. Overview & Conventions

All endpoints adhere to RESTful conventions, using JSON for both request bodies and responses. Standard HTTP response codes represent operational outcomes.

* **Base URL**: `http://localhost:5000/api`
* **Content-Type**: `application/json`
* **Authentication Assumption**: Standard dispatcher session simulated via optional header `x-dispatcher-id: dispatcher-1` (defaulting to system dispatcher).
* **Validation Standard**: All payloads validated through Zod middleware before entering controller logic.

---

## 2. Service Request Endpoints (`/api/requests`)

### 2.1 `POST /api/requests`
Create a new service request.

* **Purpose**: Register a customer work order for the operating day.
* **Request Body**:
```json
{
  "customerName": "Apex Healthcare Facility",
  "region": "North",
  "requiredSkill": "HVAC",
  "priority": "HIGH",
  "durationMinutes": 90,
  "windowStart": "09:00",
  "windowEnd": "12:00",
  "targetDate": "2026-10-15"
}
```
* **Response `201 Created`**:
```json
{
  "id": "sr-101",
  "customerName": "Apex Healthcare Facility",
  "region": "North",
  "requiredSkill": "HVAC",
  "priority": "HIGH",
  "durationMinutes": 90,
  "windowStart": "09:00",
  "windowEnd": "12:00",
  "status": "UNASSIGNED",
  "targetDate": "2026-10-15",
  "createdAt": "2026-10-15T07:30:00Z"
}
```
* **Error Responses**:
  * `400 Bad Request`: `windowEnd` is earlier than or equal to `windowStart`, or duration exceeds window.

### 2.2 `GET /api/requests`
List all service requests for a target date.

* **Query Parameters**: `targetDate=2026-10-15` (optional, defaults to current operating day), `status=UNASSIGNED` (optional filter).
* **Response `200 OK`**: Array of `ServiceRequest` objects.

### 2.3 `PATCH /api/requests/:id`
Update an existing service request.

* **Purpose**: Adjust customer time windows, priority, or status.
* **Request Body** (partial):
```json
{
  "priority": "EMERGENCY",
  "windowEnd": "13:00"
}
```
* **Response `200 OK`**: Updated `ServiceRequest` object.
* **Error Responses**:
  * `400 Bad Request`: Cannot alter required skills or duration if request is already `COMPLETED`.
  * `404 Not Found`: Request ID not found.

---

## 3. Technician Endpoints (`/api/technicians`)

### 3.1 `POST /api/technicians`
Register a field technician.

* **Request Body**:
```json
{
  "name": "Carlos Rivera",
  "region": "North",
  "skills": ["HVAC", "Plumbing"],
  "shiftStart": "08:00",
  "shiftEnd": "17:00",
  "maxWorkloadMinutes": 420
}
```
* **Response `201 Created`**: Technician entity with unique `id`.

### 3.2 `GET /api/technicians`
Retrieve list of technicians with their operational regions, skills, and current shift parameters.

* **Response `200 OK`**: Array of `Technician` objects.

### 3.3 `PATCH /api/technicians/:id`
Update technician availability status or shift parameters.

* **Request Body**:
```json
{
  "isAvailable": false,
  "notes": "Called out sick mid-day"
}
```
* **Response `200 OK`**: Updated technician object + alert flag indicating active assignments impacted.

---

## 4. Scheduling & AI Planning Endpoints (`/api/schedules`)

### 4.1 `POST /api/schedules/generate`
Generate an AI-proposed baseline schedule for a target date.

* **Purpose**: Queries AI planning agent, executes deterministic validation on candidate proposal, and returns draft schedule with trade-off analysis.
* **Request Body**:
```json
{
  "targetDate": "2026-10-15"
}
```
* **Response `200 OK`**:
```json
{
  "scheduleId": "sch-001",
  "proposedVersion": {
    "versionNumber": 1,
    "status": "PROPOSED",
    "summary": "Assigned 9 of 10 requests across 4 technicians with balanced workloads.",
    "tradeOffs": [
      "Assigned Carlos to SR-101 and SR-103 back-to-back to eliminate idle travel.",
      "Deferred SR-108 (Low priority) due to North region HVAC capacity limits."
    ],
    "risks": [
      {
        "severity": "MEDIUM",
        "description": "Technician Maria has only 15 minutes between SR-102 and SR-105.",
        "affectedTechnicianId": "tech-02"
      }
    ],
    "unassignedRequests": [
      {
        "serviceRequestId": "sr-108",
        "reason": "Exceeds daily max workload for North region HVAC certified technicians.",
        "recommendedAction": "Reschedule to tomorrow or authorize 30 mins overtime."
      }
    ],
    "suggestedQuestions": [
      "Can Customer SR-108 accept an arrival window after 16:30?"
    ],
    "validation": {
      "isValid": true,
      "violations": [],
      "technicianWorkloadSummary": {
        "tech-01": { "usedMinutes": 360, "maxMinutes": 420 },
        "tech-02": { "usedMinutes": 330, "maxMinutes": 420 }
      }
    },
    "assignments": [
      {
        "serviceRequestId": "sr-101",
        "technicianId": "tech-01",
        "startTime": "08:30",
        "endTime": "10:00",
        "durationMinutes": 90,
        "reasoning": "Fits shift start and matches North HVAC requirement."
      }
    ]
  }
}
```

### 4.2 `POST /api/schedules/:id/replan`
Trigger an intraday replan due to an emergency ticket or technician cancellation.

* **Purpose**: Generates candidate replan preserving all `COMPLETED` and `IN_PROGRESS` assignments, and computes exact visual diffs against active schedule version.
* **Request Body**:
```json
{
  "triggerReason": "EMERGENCY_REQUEST",
  "emergencyRequestId": "sr-111"
}
```
* **Response `200 OK`**:
```json
{
  "proposedVersionNumber": 2,
  "diff": {
    "unchanged": ["sr-101", "sr-102"],
    "rescheduled": [
      { "serviceRequestId": "sr-104", "oldStart": "13:00", "newStart": "14:30" }
    ],
    "reassigned": [
      { "serviceRequestId": "sr-106", "fromTech": "tech-01", "toTech": "tech-03" }
    ],
    "newlyAssigned": ["sr-111"],
    "unassigned": ["sr-107"]
  },
  "validation": { "isValid": true, "violations": [] },
  "planSummary": "Emergency gas leak accommodated by shifting routine inspection SR-104."
}
```

### 4.3 `GET /api/schedules/:id`
Fetch active schedule with its current approved assignments and timeline view.

---

## 5. Approval & Version Lifecycle (`/api/schedules/:id/approve`)

### 5.1 `POST /api/schedules/:id/approve`
Approve the draft proposal and activate a new `ScheduleVersion`.

* **Request Body**:
```json
{
  "versionNumber": 1,
  "dispatcherNotes": "Approved baseline morning schedule."
}
```
* **Action**:
  1. Validates proposal one final time against deterministic engine.
  2. Commits `ScheduleVersion` and clones `Assignment` records inside a database transaction.
  3. Appends an `AuditLog` entry.
  4. Generates simulated `Notification` records for affected technicians.
* **Response `200 OK`**:
```json
{
  "success": true,
  "activeVersion": 1,
  "status": "APPROVED",
  "notificationsDispatched": 4
}
```
* **Error Responses**:
  * `409 Conflict`: Cannot approve a version with hard constraint violations.

### 5.2 `POST /api/schedules/:id/reject`
Reject the pending AI proposal.

* **Request Body**:
```json
{
  "versionNumber": 1,
  "rejectionReason": "Workload too skewed towards Carlos."
}
```
* **Response `200 OK`**: Proposal marked `REJECTED`, active schedule unaffected.

### 5.3 `GET /api/schedules/:id/versions`
Fetch historical version list for the schedule, including created timestamps, approver notes, and assignment diffs.

---

## 6. Manual Overrides & Validation (`/api/assignments`)

### 6.1 `POST /api/assignments/validate`
Check feasibility of a tentative manual modification before committing.

* **Request Body**:
```json
{
  "serviceRequestId": "sr-103",
  "technicianId": "tech-01",
  "startTime": "11:00",
  "endTime": "12:30"
}
```
* **Response `200 OK`**:
```json
{
  "isValid": false,
  "violations": [
    {
      "rule": "OVERLAP",
      "errorCode": "ERR_DOUBLE_BOOKING",
      "message": "Collides with existing assignment SR-105 (11:30 - 12:30) on Carlos Rivera."
    }
  ]
}
```

### 6.2 `PATCH /api/assignments/:id`
Apply a validated manual override to an assignment.

* **Request Body**:
```json
{
  "technicianId": "tech-02",
  "startTime": "13:30",
  "endTime": "15:00",
  "overrideReason": "Technician requested reassignment due to traffic"
}
```
* **Response `200 OK`**: Creates a new schedule version with `isManualOverride: true` and logs audit entry.
* **Error Responses**:
  * `422 Unprocessable Entity`: Breaches hard constraint.
  * `403 Forbidden`: Cannot alter an assignment with `lockState: LOCKED_COMPLETED`.

---

## 7. Audit & Mock Notification Endpoints

### 7.1 `GET /api/audit-logs`
Retrieve filterable audit entries.

* **Query Parameters**: `entityType`, `entityId`, `limit=50`.
* **Response `200 OK`**: Array of audit log records with actor, action, timestamp, and JSON diffs.

### 7.2 `GET /api/notifications`
Retrieve simulated technician notifications generated by schedule activations.

* **Query Parameters**: `scheduleVersionId`, `technicianId`.
* **Response `200 OK`**: Array of mock notification items.
