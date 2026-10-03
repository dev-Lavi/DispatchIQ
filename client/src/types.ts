export type Region = 'North' | 'South' | 'Central';

export type Skill = 'HVAC' | 'Electrical' | 'Plumbing';

export type Priority = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RequestStatus = 'UNASSIGNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type AssignmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type LockState = 'UNLOCKED' | 'LOCKED_COMPLETED' | 'LOCKED_IN_PROGRESS';

export type VersionStatus = 'PROPOSED' | 'APPROVED' | 'SUPERSEDED' | 'REJECTED';

export interface Technician {
  id: string;
  name: string;
  region: Region;
  skills: Skill[];
  shiftStart: string;
  shiftEnd: string;
  maxWorkloadMinutes: number;
  isAvailable: boolean;
  avatar?: string;
}

export interface ServiceRequest {
  id: string;
  customerName: string;
  region: Region;
  requiredSkill: Skill;
  priority: Priority;
  durationMinutes: number;
  windowStart: string;
  windowEnd: string;
  status: RequestStatus;
  targetDate: string;
  notes?: string;
}

export interface Assignment {
  id: string;
  scheduleVersionId: string;
  serviceRequestId: string;
  technicianId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: AssignmentStatus;
  lockState: LockState;
  isManualOverride: boolean;
  overrideReason?: string;
  assignedBy: 'AI_AGENT' | 'DISPATCHER' | 'SYSTEM';
  reasoning?: string;
}

export interface ProposedAssignment {
  serviceRequestId: string;
  technicianId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reasoning: string;
  isLocked?: boolean;
}

export interface UnassignedAnalysis {
  serviceRequestId: string;
  reason: string;
  recommendedAction: string;
}

export interface OperationalRisk {
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  affectedTechnicianId?: string;
  affectedRequestId?: string;
}

export interface ScheduleVersion {
  id: string;
  scheduleId: string;
  versionNumber: number;
  status: VersionStatus;
  triggerReason: string;
  summary: string;
  tradeOffs: string[];
  risks: OperationalRisk[];
  unassignedNotes: UnassignedAnalysis[];
  suggestedQuestions: string[];
  createdBy: 'AI_AGENT' | 'DISPATCHER' | 'SYSTEM';
  createdAt: string;
}

export interface Schedule {
  id: string;
  targetDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationViolation {
  rule: 'SKILL' | 'REGION' | 'SHIFT' | 'WINDOW' | 'OVERLAP' | 'WORKLOAD' | 'COMPLETED_LOCK';
  errorCode: string;
  technicianId?: string;
  serviceRequestId?: string;
  message: string;
}

export interface ScheduleValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  technicianWorkloadSummary: Record<string, { usedMinutes: number; maxMinutes: number }>;
}

export interface ScheduleDiff {
  unchanged: string[];
  rescheduled: Array<{
    serviceRequestId: string;
    technicianId: string;
    oldStart: string;
    newStart: string;
    oldEnd: string;
    newEnd: string;
  }>;
  reassigned: Array<{
    serviceRequestId: string;
    fromTechId: string;
    toTechId: string;
    newStart: string;
    newEnd: string;
  }>;
  newlyAssigned: string[];
  unassigned: string[];
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  changeDiff: any;
  timestamp: string;
}

export interface Notification {
  id: string;
  technicianId: string;
  scheduleVersionId: string;
  channel: string;
  title: string;
  messagePayload: string;
  status: string;
  sentAt: string;
}

export interface AppState {
  schedule: Schedule;
  currentVersion?: ScheduleVersion;
  currentAssignments: Assignment[];
  versions: ScheduleVersion[];
  technicians: Technician[];
  requests: ServiceRequest[];
  draftProposal?: any;
  auditLogs: AuditLog[];
  notifications: Notification[];
}
