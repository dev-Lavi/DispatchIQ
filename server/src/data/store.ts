import {
  Technician,
  ServiceRequest,
  Schedule,
  ScheduleVersion,
  Assignment,
  AuditLog,
  Notification,
  ProposedAssignment,
  ApprovalDecision,
} from '../types/index.js';
import { SEED_TECHNICIANS, SEED_REQUESTS, TARGET_DATE, EMERGENCY_REQUEST_SEED } from './seedData.js';

export class DispatchStore {
  private static instance: DispatchStore;

  private technicians: Map<string, Technician> = new Map();
  private requests: Map<string, ServiceRequest> = new Map();
  private schedule: Schedule;
  private versions: Map<string, ScheduleVersion> = new Map();
  private assignmentsByVersion: Map<string, Assignment[]> = new Map();
  private auditLogs: AuditLog[] = [];
  private notifications: Notification[] = [];
  private draftProposal: any = null;

  private constructor() {
    this.schedule = {
      id: 'sch-main',
      targetDate: TARGET_DATE,
      status: 'DRAFT',
      currentVersionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.resetToEmpty();
  }

  public static getInstance(): DispatchStore {
    if (!DispatchStore.instance) {
      DispatchStore.instance = new DispatchStore();
    }
    return DispatchStore.instance;
  }

  public resetToEmpty(): void {
    this.technicians.clear();
    for (const tech of SEED_TECHNICIANS) {
      this.technicians.set(tech.id, JSON.parse(JSON.stringify(tech)));
    }

    this.requests.clear();
    this.versions.clear();
    this.assignmentsByVersion.clear();
    this.draftProposal = null;

    this.schedule = {
      id: 'sch-main',
      targetDate: TARGET_DATE,
      status: 'DRAFT',
      currentVersionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.auditLogs = [
      {
        id: `audit-${Date.now()}`,
        entityType: 'SCHEDULE',
        entityId: this.schedule.id,
        action: 'RESET',
        actor: 'SYSTEM',
        changeDiff: { message: 'System initialized with clean slate (0 work orders)' },
        timestamp: new Date().toISOString(),
      },
    ];

    this.notifications = [];
  }

  public resetToSeed(): void {
    this.technicians.clear();
    for (const tech of SEED_TECHNICIANS) {
      this.technicians.set(tech.id, JSON.parse(JSON.stringify(tech)));
    }

    this.requests.clear();
    for (const req of SEED_REQUESTS) {
      this.requests.set(req.id, JSON.parse(JSON.stringify(req)));
    }

    this.versions.clear();
    this.assignmentsByVersion.clear();
    this.draftProposal = null;

    this.schedule = {
      id: 'sch-main',
      targetDate: TARGET_DATE,
      status: 'DRAFT',
      currentVersionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.auditLogs = [
      {
        id: `audit-${Date.now()}`,
        entityType: 'SCHEDULE',
        entityId: this.schedule.id,
        action: 'RESET',
        actor: 'SYSTEM',
        changeDiff: { message: 'System initialized with baseline seed data' },
        timestamp: new Date().toISOString(),
      },
    ];

    this.notifications = [];
  }

  // --- Technicians ---
  public getTechnicians(): Technician[] {
    return Array.from(this.technicians.values());
  }

  public getTechnician(id: string): Technician | undefined {
    return this.technicians.get(id);
  }

  public updateTechnician(id: string, updates: Partial<Technician>): Technician | undefined {
    const tech = this.technicians.get(id);
    if (!tech) return undefined;
    const updated = { ...tech, ...updates, updatedAt: new Date().toISOString() };
    this.technicians.set(id, updated);

    this.logAudit({
      entityType: 'TECHNICIAN',
      entityId: id,
      action: 'TECHNICIAN_STATUS_CHANGED',
      actor: 'DISPATCHER',
      changeDiff: { previous: tech, updated },
    });

    return updated;
  }

  // --- Service Requests ---
  public getRequests(): ServiceRequest[] {
    return Array.from(this.requests.values());
  }

  public getRequest(id: string): ServiceRequest | undefined {
    return this.requests.get(id);
  }

  public createRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ServiceRequest {
    const id = data.id || `SR-${Math.floor(100 + Math.random() * 900)}`;
    const newReq: ServiceRequest = {
      ...data,
      id,
      status: data.status || 'UNASSIGNED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(id, newReq);

    this.logAudit({
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      action: 'PROPOSAL_GENERATED',
      actor: 'DISPATCHER',
      changeDiff: { newRequest: newReq },
    });

    return newReq;
  }

  public updateRequest(id: string, updates: Partial<ServiceRequest>): ServiceRequest | undefined {
    const req = this.requests.get(id);
    if (!req) return undefined;
    const updated = { ...req, ...updates, updatedAt: new Date().toISOString() };
    this.requests.set(id, updated);
    return updated;
  }

  public addEmergencyRequest(): ServiceRequest {
    const existing = this.requests.get(EMERGENCY_REQUEST_SEED.id);
    if (existing) return existing;
    const emergency = JSON.parse(JSON.stringify(EMERGENCY_REQUEST_SEED));
    emergency.createdAt = new Date().toISOString();
    emergency.updatedAt = new Date().toISOString();
    this.requests.set(emergency.id, emergency);

    this.logAudit({
      entityType: 'SERVICE_REQUEST',
      entityId: emergency.id,
      action: 'REPLAN_EMERGENCY',
      actor: 'DISPATCHER',
      changeDiff: { emergencyWorkOrder: emergency },
    });

    return emergency;
  }

  // --- Schedules & Versions ---
  public getSchedule(): Schedule {
    return this.schedule;
  }

  public getVersions(): ScheduleVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => b.versionNumber - a.versionNumber);
  }

  public getVersion(id: string): ScheduleVersion | undefined {
    return this.versions.get(id);
  }

  public getCurrentVersion(): ScheduleVersion | undefined {
    if (!this.schedule.currentVersionId) return undefined;
    return this.versions.get(this.schedule.currentVersionId);
  }

  public getAssignmentsForVersion(versionId: string): Assignment[] {
    return this.assignmentsByVersion.get(versionId) || [];
  }

  public getCurrentAssignments(): Assignment[] {
    if (!this.schedule.currentVersionId) return [];
    return this.getAssignmentsForVersion(this.schedule.currentVersionId);
  }

  public setDraftProposal(proposal: any): void {
    this.draftProposal = proposal;
  }

  public getDraftProposal(): any {
    return this.draftProposal;
  }

  public commitVersion(
    versionData: Omit<ScheduleVersion, 'id' | 'scheduleId' | 'versionNumber' | 'status' | 'createdAt' | 'createdBy'>,
    proposedAssignments: ProposedAssignment[],
    actor: 'DISPATCHER' | 'AI_AGENT' | 'SYSTEM' = 'DISPATCHER'
  ): { version: ScheduleVersion; assignments: Assignment[] } {
    const nextNumber = this.versions.size + 1;
    const versionId = `ver-${nextNumber}-${Date.now()}`;

    // Mark previous active version as SUPERSEDED
    if (this.schedule.currentVersionId) {
      const prev = this.versions.get(this.schedule.currentVersionId);
      if (prev) {
        prev.status = 'SUPERSEDED';
      }
    }

    const version: ScheduleVersion = {
      ...versionData,
      id: versionId,
      scheduleId: this.schedule.id,
      versionNumber: nextNumber,
      status: 'APPROVED',
      createdBy: actor,
      createdAt: new Date().toISOString(),
    };

    const newAssignments: Assignment[] = proposedAssignments.map((p, idx) => {
      // Check if existing assignment was locked completed or in progress
      const existingReq = this.requests.get(p.serviceRequestId);
      const isCompleted = existingReq?.status === 'COMPLETED' || p.isLocked;
      const isInProgress = existingReq?.status === 'IN_PROGRESS';

      // Update request status
      if (existingReq && existingReq.status === 'UNASSIGNED') {
        existingReq.status = 'SCHEDULED';
      }

      return {
        id: `asgn-${versionId}-${idx + 1}`,
        scheduleVersionId: versionId,
        serviceRequestId: p.serviceRequestId,
        technicianId: p.technicianId,
        startTime: p.startTime,
        endTime: p.endTime,
        durationMinutes: p.durationMinutes,
        status: isCompleted ? 'COMPLETED' : isInProgress ? 'IN_PROGRESS' : 'SCHEDULED',
        lockState: isCompleted ? 'LOCKED_COMPLETED' : isInProgress ? 'LOCKED_IN_PROGRESS' : 'UNLOCKED',
        isManualOverride: false,
        assignedBy: actor,
        reasoning: p.reasoning,
      };
    });

    this.versions.set(versionId, version);
    this.assignmentsByVersion.set(versionId, newAssignments);

    this.schedule.currentVersionId = versionId;
    this.schedule.status = 'ACTIVE';
    this.schedule.updatedAt = new Date().toISOString();

    // Clear draft proposal
    this.draftProposal = null;

    // Generate simulated notifications for affected technicians
    this.generateNotificationsForVersion(version, newAssignments);

    // Audit log
    this.logAudit({
      entityType: 'SCHEDULE_VERSION',
      entityId: versionId,
      action: 'VERSION_APPROVED',
      actor,
      changeDiff: {
        versionNumber: nextNumber,
        assignedCount: newAssignments.length,
        summary: version.summary,
      },
    });

    return { version, assignments: newAssignments };
  }

  // --- Manual Override on Active Schedule ---
  public applyManualOverride(
    assignmentId: string,
    technicianId: string,
    startTime: string,
    endTime: string,
    overrideReason: string
  ): { version: ScheduleVersion; assignments: Assignment[] } {
    const currentAssignments = this.getCurrentAssignments();
    const currentVersion = this.getCurrentVersion();
    if (!currentVersion) throw new Error('No active schedule version to override');

    const targetIdx = currentAssignments.findIndex(a => a.id === assignmentId);
    if (targetIdx === -1) throw new Error('Assignment not found');

    const target = currentAssignments[targetIdx];
    if (target.lockState === 'LOCKED_COMPLETED') {
      throw new Error('Cannot override completed assignment');
    }

    const proposed: ProposedAssignment[] = currentAssignments.map(a => {
      if (a.id === assignmentId) {
        return {
          serviceRequestId: a.serviceRequestId,
          technicianId,
          startTime,
          endTime,
          durationMinutes: a.durationMinutes,
          reasoning: `Manual override: ${overrideReason}`,
          isLocked: a.lockState !== 'UNLOCKED',
        };
      }
      return {
        serviceRequestId: a.serviceRequestId,
        technicianId: a.technicianId,
        startTime: a.startTime,
        endTime: a.endTime,
        durationMinutes: a.durationMinutes,
        reasoning: a.reasoning || '',
        isLocked: a.lockState !== 'UNLOCKED',
      };
    });

    return this.commitVersion(
      {
        triggerReason: 'MANUAL_DISPATCHER_OVERRIDE',
        summary: `Manual override applied on assignment for ${target.serviceRequestId}.`,
        tradeOffs: currentVersion.tradeOffs,
        risks: currentVersion.risks,
        unassignedNotes: currentVersion.unassignedNotes,
        suggestedQuestions: currentVersion.suggestedQuestions,
      },
      proposed,
      'DISPATCHER'
    );
  }

  // --- Notifications ---
  private generateNotificationsForVersion(version: ScheduleVersion, assignments: Assignment[]): void {
    const assignmentsByTech = new Map<string, Assignment[]>();
    for (const asgn of assignments) {
      const list = assignmentsByTech.get(asgn.technicianId) || [];
      list.push(asgn);
      assignmentsByTech.set(asgn.technicianId, list);
    }

    for (const [techId, list] of assignmentsByTech.entries()) {
      const tech = this.technicians.get(techId);
      if (!tech) continue;

      const notif: Notification = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        technicianId: techId,
        scheduleVersionId: version.id,
        channel: 'MOCK_SMS',
        title: `Schedule Version ${version.versionNumber} Activated`,
        messagePayload: `Hi ${tech.name}, your itinerary for ${TARGET_DATE} has ${list.length} assignments scheduled. First job begins at ${list[0]?.startTime || 'N/A'}.`,
        status: 'DELIVERED',
        sentAt: new Date().toISOString(),
      };
      this.notifications.unshift(notif);
    }
  }

  public getNotifications(): Notification[] {
    return this.notifications;
  }

  // --- Audit Logs ---
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const log: AuditLog = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }
}
