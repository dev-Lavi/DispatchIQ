# 11 — Testing & Verification Strategy

## 1. Quality Assurance Philosophy

Because the system manages critical real-world field dispatching operations, the testing strategy is structured around the **ironclad isolation of deterministic hard rules**. While the AI tier provides intelligent heuristics, the deterministic constraint engine and approval state machines are tested to 100% boundary coverage.

```
       ┌────────────────────────────────────────────────────────┐
       │                 E2E TESTS (Playwright)                 │
       │    Full Dispatcher Lifecycle & Disruption Journeys     │
       └───────────────────────────┬────────────────────────────┘
                                   │
       ┌───────────────────────────┴────────────────────────────┐
       │             INTEGRATION TESTS (Supertest / API)        │
       │     API Controllers, Transactions, Versioning, Audits  │
       └───────────────────────────┬────────────────────────────┘
                                   │
       ┌───────────────────────────┴────────────────────────────┐
       │                 AI RESILIENCE & ADAPTER TESTS          │
       │   Schema Violations, Hallucination Traps, Fallbacks    │
       └───────────────────────────┬────────────────────────────┘
                                   │
       ┌───────────────────────────┴────────────────────────────┐
       │             UNIT TESTS (Vitest - 100% Deterministic)   │
       │  Skills, Regions, Shifts, Windows, Overlaps, Workload  │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Unit Testing Strategy: Deterministic Constraint Engine

The pure TypeScript module `DeterministicConstraintEngine` is verified with an exhaustive, zero-mock unit test matrix covering all boundary conditions.

| Test Case ID | Target Rule | Input Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **UT-RULE-01** | All Valid | Proper skill, region, within shift, within window, no overlap, workload under cap. | `isValid: true`, `violations: []` |
| **UT-SKILL-01** | Skill Check | Technician has `["Plumbing"]`, request requires `"HVAC"`. | `isValid: false`, `ERR_SKILL_MISMATCH` |
| **UT-SKILL-02** | Skill Subset | Technician has `["HVAC", "Electrical"]`, request requires `"HVAC"`. | `isValid: true` |
| **UT-REGION-01**| Region Check | Technician in `"North"`, request location is `"South"`. | `isValid: false`, `ERR_REGION_MISMATCH` |
| **UT-SHIFT-01** | Shift Start | Technician shift starts at `08:00`, assignment starts at `07:45`. | `isValid: false`, `ERR_OUTSIDE_SHIFT` |
| **UT-SHIFT-02** | Shift End | Technician shift ends at `17:00`, assignment ends at `17:15`. | `isValid: false`, `ERR_OUTSIDE_SHIFT` |
| **UT-SHIFT-03** | Tech Off | Technician has `isAvailable: false`. | `isValid: false`, `ERR_OUTSIDE_SHIFT` |
| **UT-WIND-01**  | Window Start | Customer window `10:00–14:00`, assignment starts at `09:30`. | `isValid: false`, `ERR_OUTSIDE_WINDOW` |
| **UT-WIND-02**  | Window End | Customer window `10:00–14:00`, assignment ends at `14:15`. | `isValid: false`, `ERR_OUTSIDE_WINDOW` |
| **UT-OVER-01**  | Exact Overlap | Assignment A `09:00–10:30`, Assignment B `09:00–10:30` on same tech. | `isValid: false`, `ERR_DOUBLE_BOOKING` |
| **UT-OVER-02**  | Partial Overlap | Assignment A `09:00–10:30`, Assignment B `10:00–11:30` on same tech. | `isValid: false`, `ERR_DOUBLE_BOOKING` |
| **UT-OVER-03**  | Enclosing Overlap| Assignment A `09:00–12:00`, Assignment B `10:00–11:00` on same tech. | `isValid: false`, `ERR_DOUBLE_BOOKING` |
| **UT-OVER-04**  | Adjacent Back-to-Back| Assignment A `09:00–10:00`, Assignment B `10:00–11:00`. | `isValid: true` (Abutting edges permitted) |
| **UT-WORK-01**  | Workload Limit | Tech max workload `420m`. Assignments total `435m`. | `isValid: false`, `ERR_EXCEEDS_MAX_WORKLOAD` |
| **UT-LOCK-01**  | Completed Lock | Assignment status is `COMPLETED`; replan attempts to change tech ID. | `isValid: false`, `ERR_COMPLETED_JOB_LOCKED` |
| **UT-LOCK-02**  | Completed Shift | Assignment status is `COMPLETED`; replan attempts to shift start time. | `isValid: false`, `ERR_COMPLETED_JOB_LOCKED` |

---

## 3. Integration Testing Strategy: REST API & Versioning Lifecycle

Integration tests leverage `Supertest` against an isolated PostgreSQL/Prisma test database instance.

### 3.1 Key Scenarios Tested
1. **Schedule Generation (`POST /api/schedules/generate`)**:
   * Generates candidate proposal with status `PROPOSED`.
   * Verifies response structure contains assignments, reasoning, and validation status.
2. **Approval & Activation (`POST /api/schedules/:id/approve`)**:
   * Atomically transitions schedule to `ACTIVE`.
   * Creates `ScheduleVersion` record #1.
   * Clones candidate assignments with immutable foreign keys.
   * Verifies mock `Notification` records are created for all 4 technicians.
3. **Emergency Disruption (`POST /api/schedules/:id/replan`)**:
   * Ingests high-priority request.
   * Confirms `COMPLETED` assignments retain identical time and technician.
   * Generates correct diff categorization (`unchanged`, `rescheduled`, `newlyAssigned`).
4. **Manual Dispatcher Override (`PATCH /api/assignments/:id`)**:
   * Saves valid manual time change, updates version number, and logs audit record.
   * Blocks invalid manual time change with `422 Unprocessable Entity` and returns violation payload.

---

## 4. AI Resilience & Safety Testing (Hallucination Defense)

Tests verify that the system gracefully handles any anomalous, malformed, or malicious AI output without crashing or violating business invariants.

```typescript
describe('AI Output Robustness & Defensive Parsing', () => {
  it('safely rejects AI responses with malformed JSON syntax', async () => {
    const rawAiOutput = '{"planSummary": "broken json...';
    const result = await parseAndValidateAiOutput(rawAiOutput);
    expect(result.fallbackTriggered).toBe(true);
    expect(result.proposal.assignments.length).toBeGreaterThan(0); // Fallback heuristic engaged
  });

  it('detects and blocks hallucinated non-existent technician IDs', async () => {
    const maliciousProposal = {
      assignments: [{
        serviceRequestId: 'sr-101',
        technicianId: 'tech-999-ghost', // Hallucinated ID
        startTime: '09:00',
        endTime: '10:30'
      }]
    };
    const validation = await validateCandidateProposal(maliciousProposal);
    expect(validation.isValid).toBe(false);
    expect(validation.violations[0].errorCode).toBe('ERR_ENTITY_NOT_FOUND');
  });

  it('safely catches AI proposing two assignments in overlapping slots', async () => {
    const doubleBookedProposal = {
      assignments: [
        { serviceRequestId: 'sr-101', technicianId: 'tech-01', startTime: '09:00', endTime: '10:30' },
        { serviceRequestId: 'sr-102', technicianId: 'tech-01', startTime: '10:00', endTime: '11:00' }
      ]
    };
    const validation = await validateCandidateProposal(doubleBookedProposal);
    expect(validation.isValid).toBe(false);
    expect(validation.violations[0].errorCode).toBe('ERR_DOUBLE_BOOKING');
  });

  it('fails safely and engages heuristic planner when AI API times out or fails', async () => {
    mockAiServiceToTimeout();
    const plan = await planningService.generatePlan({ targetDate: '2026-10-15' });
    expect(plan.source).toBe('HEURISTIC_FALLBACK');
    expect(plan.validation.isValid).toBe(true);
  });
});
```

---

## 5. End-to-End (E2E) Dispatcher Flow Test (Playwright)

A complete browser simulation executing the primary user journey:

```text
[ Test: E2E Dispatcher Journey Under Emergency Disruption ]
1. Navigate to http://localhost:5173/dashboard
2. Verify 10 unassigned requests and 4 technicians listed.
3. Click "Generate Optimal Schedule Plan".
4. Wait for AI proposal to appear in review drawer.
5. Assert validation indicator shows: "ALL 7 HARD CONSTRAINTS PASSED".
6. Click "Approve & Publish (Version 1)".
7. Assert timeline updates to ACTIVE v1.
8. Assert Notification Feed shows 4 dispatched technician itineraries.
9. Mark Task SR-101 on Carlos's timeline as "COMPLETED".
10. Click "+ New Emergency Work Order":
    - Customer: "Mercy General Hospital"
    - Region: "North", Skill: "Plumbing", Priority: "EMERGENCY", Duration: 60m
11. Click "Generate Disruption Replan".
12. Assert diff drawer opens:
    - SR-101 (Completed) has LOCKED icon and identical time slot.
    - SR-109 (Emergency) is highlighted in green on Carlos's row.
    - Routine inspection SR-103 is shifted to 14:00.
13. Click "Approve Replanned Schedule".
14. Assert header displays: "Version 2 (ACTIVE) - Approved by Dispatcher".
15. Navigate to /audit-log: Assert all version transitions and locked events are recorded.
```

---

## 6. Continuous Integration (CI) Pipeline Configuration

* **Pre-commit**: ESLint, Prettier, and TypeScript type-check (`tsc --noEmit`).
* **Unit & Rule Suite**: Executes in < 3 seconds on Vitest.
* **Integration Suite**: Runs with an in-memory SQLite or ephemeral Postgres container.
* **E2E Suite**: Headless Playwright tests validating core user flows before any deployment.
