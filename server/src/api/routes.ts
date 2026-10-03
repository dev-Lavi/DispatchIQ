import { Router, Request, Response } from 'express';
import { DispatchStore } from '../data/store.js';
import { PlanningService } from '../ai/planningService.js';
import { DeterministicConstraintEngine } from '../engine/constraintEngine.js';
import { ProposedAssignment, Assignment } from '../types/index.js';

export const apiRouter = Router();
const store = DispatchStore.getInstance();

// 1. GET /api/state - Complete system snapshot
apiRouter.get('/state', (req: Request, res: Response) => {
  const schedule = store.getSchedule();
  const currentVersion = store.getCurrentVersion();
  const currentAssignments = store.getCurrentAssignments();
  const versions = store.getVersions();
  const technicians = store.getTechnicians();
  const requests = store.getRequests();
  const draftProposal = store.getDraftProposal();
  const auditLogs = store.getAuditLogs().slice(0, 50);
  const notifications = store.getNotifications().slice(0, 50);

  res.json({
    schedule,
    currentVersion,
    currentAssignments,
    versions,
    technicians,
    requests,
    draftProposal,
    auditLogs,
    notifications,
  });
});

// 2. Technicians
apiRouter.get('/technicians', (req: Request, res: Response) => {
  res.json(store.getTechnicians());
});

apiRouter.patch('/technicians/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { isAvailable, shiftStart, shiftEnd, maxWorkloadMinutes } = req.body;

  const updated = store.updateTechnician(id, {
    ...(isAvailable !== undefined && { isAvailable }),
    ...(shiftStart && { shiftStart }),
    ...(shiftEnd && { shiftEnd }),
    ...(maxWorkloadMinutes && { maxWorkloadMinutes }),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Technician not found' });
  }

  res.json(updated);
});

// 3. Service Requests
apiRouter.get('/requests', (req: Request, res: Response) => {
  res.json(store.getRequests());
});

apiRouter.post('/requests', (req: Request, res: Response) => {
  try {
    const { customerName, region, requiredSkill, priority, durationMinutes, windowStart, windowEnd, notes } = req.body;
    if (!customerName || !region || !requiredSkill || !priority || !durationMinutes || !windowStart || !windowEnd) {
      return res.status(400).json({ error: 'Missing required request fields' });
    }

    const newReq = store.createRequest({
      customerName,
      region,
      requiredSkill,
      priority,
      durationMinutes: Number(durationMinutes),
      windowStart,
      windowEnd,
      status: 'UNASSIGNED',
      targetDate: '2026-10-15',
      notes,
    });

    res.status(201).json(newReq);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/requests/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const updated = store.updateRequest(id, req.body);
  if (!updated) return res.status(404).json({ error: 'Request not found' });

  // If request marked completed, update active assignment lock state as well
  if (req.body.status === 'COMPLETED') {
    const activeAssignments = store.getCurrentAssignments();
    const asgn = activeAssignments.find(a => a.serviceRequestId === id);
    if (asgn) {
      asgn.status = 'COMPLETED';
      asgn.lockState = 'LOCKED_COMPLETED';
    }
    store.logAudit({
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      action: 'PROPOSAL_GENERATED',
      actor: 'DISPATCHER',
      changeDiff: { status: 'COMPLETED', note: 'Task marked completed and locked' },
    });
  }

  res.json(updated);
});

// 4. Schedules & AI Planning
apiRouter.post('/schedules/generate', async (req: Request, res: Response) => {
  try {
    const proposal = await PlanningService.generatePlan('INITIAL_PLAN');
    res.json(proposal);
  } catch (err: any) {
    console.error('Error generating schedule plan:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/schedules/replan', async (req: Request, res: Response) => {
  try {
    const { triggerReason, emergencyRequestId, technicianId } = req.body;
    const reason = triggerReason || (emergencyRequestId ? 'EMERGENCY_REPLAN' : 'DISRUPTION_REPLAN');

    // If technician cancellation was signaled
    if (technicianId) {
      store.updateTechnician(technicianId, { isAvailable: false });
    }

    const proposal = await PlanningService.generatePlan(reason);

    // Compute diff against active assignments
    const currentAssignments = store.getCurrentAssignments();
    const allRequests = store.getRequests();
    const diff = DeterministicConstraintEngine.computeScheduleDiff(
      currentAssignments,
      proposal.plan.assignments,
      allRequests
    );

    // Store draft with diff included
    store.setDraftProposal({
      ...proposal.plan,
      validation: proposal.validation,
      diff,
      triggerReason: reason,
      provider: proposal.provider,
      createdAt: new Date().toISOString(),
    });

    res.json({
      ...proposal,
      diff,
    });
  } catch (err: any) {
    console.error('Error in replan:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Approval & Rejection
apiRouter.post('/schedules/approve', (req: Request, res: Response) => {
  try {
    const draft = store.getDraftProposal();
    if (!draft) {
      return res.status(400).json({ error: 'No draft proposal exists to approve' });
    }

    // Re-verify deterministic constraints prior to commit
    const techMap = new Map(store.getTechnicians().map(t => [t.id, t]));
    const reqMap = new Map(store.getRequests().map(r => [r.id, r]));
    const currentAssignments = store.getCurrentAssignments();
    const lockedMap = new Map(
      currentAssignments
        .filter(a => a.lockState === 'LOCKED_COMPLETED' || a.status === 'COMPLETED')
        .map(a => [a.serviceRequestId, a])
    );

    const check = DeterministicConstraintEngine.validateSchedule(
      draft.assignments as ProposedAssignment[],
      techMap,
      reqMap,
      lockedMap
    );

    if (!check.isValid) {
      return res.status(409).json({
        error: 'Cannot approve proposal with hard constraint violations',
        violations: check.violations,
      });
    }

    const { version, assignments } = store.commitVersion(
      {
        triggerReason: draft.triggerReason || 'DISPATCHER_APPROVAL',
        summary: draft.planSummary,
        tradeOffs: draft.tradeOffs,
        risks: draft.risks,
        unassignedNotes: draft.unassignedRequests,
        suggestedQuestions: draft.suggestedQuestions,
      },
      draft.assignments,
      'DISPATCHER'
    );

    res.json({
      success: true,
      version,
      assignments,
      message: `Schedule Version ${version.versionNumber} activated successfully`,
    });
  } catch (err: any) {
    console.error('Error approving proposal:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/schedules/reject', (req: Request, res: Response) => {
  const { rejectionReason } = req.body;
  const draft = store.getDraftProposal();
  if (!draft) {
    return res.status(400).json({ error: 'No draft proposal exists to reject' });
  }

  store.logAudit({
    entityType: 'SCHEDULE_VERSION',
    entityId: 'draft',
    action: 'VERSION_REJECTED',
    actor: 'DISPATCHER',
    changeDiff: {
      reason: rejectionReason || 'Rejected by dispatcher',
      rejectedProposal: draft.planSummary,
    },
  });

  store.setDraftProposal(null);
  res.json({ success: true, message: 'Proposal rejected and dismissed' });
});

// 6. Manual Overrides & Pre-Flight Validation
apiRouter.post('/assignments/validate', (req: Request, res: Response) => {
  const { serviceRequestId, technicianId, startTime, endTime } = req.body;
  const tech = store.getTechnician(technicianId);
  const reqObj = store.getRequest(serviceRequestId);

  if (!tech || !reqObj) {
    return res.status(404).json({ error: 'Technician or Request not found' });
  }

  const currentAssignments = store.getCurrentAssignments();
  const locked = currentAssignments.find(a => a.serviceRequestId === serviceRequestId);

  const duration = DeterministicConstraintEngine.timeToMinutes(endTime) - DeterministicConstraintEngine.timeToMinutes(startTime);

  const violations = DeterministicConstraintEngine.validateSingleAssignment(
    {
      serviceRequestId,
      technicianId,
      startTime,
      endTime,
      durationMinutes: duration,
      reasoning: 'Pre-flight check',
    },
    tech,
    reqObj,
    locked
  );

  // Check overlap with other assignments for this technician
  const otherAssignments = currentAssignments.filter(
    a => a.technicianId === technicianId && a.serviceRequestId !== serviceRequestId
  );

  const newStartMin = DeterministicConstraintEngine.timeToMinutes(startTime);
  const newEndMin = DeterministicConstraintEngine.timeToMinutes(endTime);

  for (const asgn of otherAssignments) {
    const curStart = DeterministicConstraintEngine.timeToMinutes(asgn.startTime);
    const curEnd = DeterministicConstraintEngine.timeToMinutes(asgn.endTime);
    if (newStartMin < curEnd && newEndMin > curStart) {
      violations.push({
        rule: 'OVERLAP',
        errorCode: 'ERR_DOUBLE_BOOKING',
        technicianId,
        serviceRequestId,
        message: `Collides with existing assignment for ${asgn.serviceRequestId} (${asgn.startTime}–${asgn.endTime}) on ${tech.name}`,
      });
    }
  }

  res.json({
    isValid: violations.length === 0,
    violations,
  });
});

apiRouter.patch('/assignments/:id/override', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { technicianId, startTime, endTime, overrideReason } = req.body;

    if (!technicianId || !startTime || !endTime || !overrideReason) {
      return res.status(400).json({ error: 'technicianId, startTime, endTime, and overrideReason are required' });
    }

    const result = store.applyManualOverride(id, technicianId, startTime, endTime, overrideReason);
    res.json({
      success: true,
      version: result.version,
      assignments: result.assignments,
    });
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
});

// 7. Shortcut: Ingest Emergency Request & Replan
apiRouter.post('/emergency', (req: Request, res: Response) => {
  try {
    const emergencyReq = store.addEmergencyRequest();
    res.json({
      success: true,
      emergencyRequest: emergencyReq,
      message: 'Emergency request SR-111 ingested. Ready to trigger replan.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Demo Reset
apiRouter.post('/demo/reset', (req: Request, res: Response) => {
  store.resetToSeed();
  res.json({
    success: true,
    message: 'Reset to baseline demo dataset (4 technicians, 10 unassigned requests)',
  });
});

// 9. Audit Logs & Notifications
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  res.json(store.getAuditLogs());
});

apiRouter.get('/notifications', (req: Request, res: Response) => {
  res.json(store.getNotifications());
});
