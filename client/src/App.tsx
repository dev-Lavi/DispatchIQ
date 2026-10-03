import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GanttTimeline } from './components/GanttTimeline';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { DiffModal } from './components/DiffModal';
import { OverrideModal } from './components/OverrideModal';
import { CreateWorkOrderModal } from './components/CreateWorkOrderModal';
import { ScenarioPresetsModal } from './components/ScenarioPresetsModal';
import { AuditNotificationTabs } from './components/AuditNotificationTabs';
import { AppState, Assignment, Region, Skill, Priority } from './types';
import { api } from './services/api';
import { PlayCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  // Load initial state
  const refreshState = async () => {
    try {
      const data = await api.getState();
      setState(data);
      if (data.draftProposal?.diff) {
        setShowDiff(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  // 1. Generate Plan
  const handleGeneratePlan = async () => {
    if (state && state.requests.length === 0) {
      setError('Backlog is empty (0 work orders). Please add a work order (+ Work Order) or load a scenario from "Scenarios" first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.generatePlan();
      await refreshState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Approve Plan
  const handleApprovePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.approvePlan();
      setSelectedVersionId(null);
      await refreshState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Reject Plan
  const handleRejectPlan = async () => {
    setLoading(true);
    try {
      await api.rejectPlan('Rejected by dispatcher');
      await refreshState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Ingest Emergency Work Order
  const handleIngestEmergency = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.addEmergencyRequest();
      await api.replan({
        triggerReason: 'EMERGENCY_REPLAN',
        emergencyRequestId: 'SR-111',
      });
      await refreshState();
      setShowDiff(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Toggle Technician Availability
  const handleToggleTechnician = async (techId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      await api.updateTechnician(techId, { isAvailable: !currentStatus });
      if (currentStatus === true && state?.schedule.status === 'ACTIVE') {
        await api.replan({
          triggerReason: 'TECHNICIAN_CANCELLATION',
          technicianId: techId,
        });
      }
      await refreshState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. Mark Completed (Test Completed Task Lock)
  const handleMarkCompleted = async (requestId: string) => {
    try {
      await api.updateRequest(requestId, { status: 'COMPLETED' });
      await refreshState();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 7. Manual Override
  const handleSaveOverride = async (
    assignmentId: string,
    technicianId: string,
    startTime: string,
    endTime: string,
    overrideReason: string
  ) => {
    await api.applyOverride(assignmentId, {
      technicianId,
      startTime,
      endTime,
      overrideReason,
    });
    await refreshState();
  };

  // 8. Demo Reset
  const handleResetDemo = async () => {
    setLoading(true);
    try {
      await api.resetDemo();
      setSelectedVersionId(null);
      setSelectedAssignment(null);
      await refreshState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 9. Create Custom Work Order
  const handleCreateRequest = async (payload: {
    customerName: string;
    region: Region;
    requiredSkill: Skill;
    priority: Priority;
    durationMinutes: number;
    windowStart: string;
    windowEnd: string;
    notes?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      await api.createRequest(payload);
      await refreshState();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 10. Run Preset Scenarios
  const handleSelectScenario = async (scenarioId: 'CLEAR' | 'BASELINE' | 'EMERGENCY' | 'TECH_SICK') => {
    setLoading(true);
    setError(null);
    try {
      if (scenarioId === 'CLEAR') {
        await api.clearBacklog();
        setSelectedVersionId(null);
        setSelectedAssignment(null);
      } else if (scenarioId === 'BASELINE') {
        await api.loadSeedDataset();
        await api.generatePlan();
      } else if (scenarioId === 'EMERGENCY') {
        if (state?.requests.length === 0) {
          await api.loadSeedDataset();
        }
        if (state?.schedule.status === 'DRAFT') {
          await api.generatePlan();
          await api.approvePlan();
        }
        await api.addEmergencyRequest();
        await api.replan({
          triggerReason: 'EMERGENCY_REPLAN',
          emergencyRequestId: 'SR-111',
        });
        setShowDiff(true);
      } else if (scenarioId === 'TECH_SICK') {
        if (state?.requests.length === 0) {
          await api.loadSeedDataset();
        }
        if (state?.schedule.status === 'DRAFT') {
          await api.generatePlan();
          await api.approvePlan();
        }
        await api.updateTechnician('tech-02', { isAvailable: false });
        await api.replan({
          triggerReason: 'TECHNICIAN_CANCELLATION',
          technicianId: 'tech-02',
        });
        setShowDiff(true);
      }
      await refreshState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#102025] font-mono text-sm">
          <div className="w-8 h-8 border-2 border-[#102025] border-t-transparent rounded-full animate-spin" />
          <span>Connecting to DispatchIQ Engine...</span>
        </div>
      </div>
    );
  }

  let displayedAssignments = state.currentAssignments;
  if (selectedVersionId) {
    displayedAssignments = state.currentAssignments;
  } else if (state.draftProposal && state.schedule.status === 'DRAFT') {
    displayedAssignments = state.draftProposal.assignments.map((p: any, i: number) => ({
      id: `preview-${i}`,
      scheduleVersionId: 'draft',
      serviceRequestId: p.serviceRequestId,
      technicianId: p.technicianId,
      startTime: p.startTime,
      endTime: p.endTime,
      durationMinutes: p.durationMinutes,
      status: 'SCHEDULED',
      lockState: 'UNLOCKED',
      isManualOverride: false,
      assignedBy: 'AI_AGENT',
    }));
  }

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#102025] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        schedule={state.schedule}
        currentVersion={state.currentVersion}
        versions={state.versions}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        onGeneratePlan={handleGeneratePlan}
        onIngestEmergency={handleIngestEmergency}
        onResetDemo={handleResetDemo}
        onOpenCreateOrder={() => setIsCreateOrderOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        loading={loading}
      />

      {/* Main Operational Canvas */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Error notification banner if any */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Guided Demo Helper Banner in Light Cream Style */}
        <div className="p-4 px-5 rounded-2xl bg-[#FFFFFF] border border-[#DAD3C9] flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F2EDE3] flex items-center justify-center text-[#102025] shrink-0">
              <PlayCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#102025] mr-2">Guided Demonstration Workflow:</span>
              <span className="text-[#6B675E] hidden sm:inline">
                1. Click <strong>"Generate AI Plan"</strong> &rarr; 2. Review Trade-offs & Approve v1 &rarr; 3. Complete SR-101 (Test Lock) &rarr; 4. Click <strong>"+ Ingest Emergency"</strong> &rarr; 5. Review Diff & Approve v2
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#EBF8F4] text-[#2A6E57] border border-[#A9DFCB]">
            <span>AI proposes &bull; Code validates &bull; Human approves</span>
          </div>
        </div>

        {/* Schedule Version Diff Viewer (if replan diff exists) */}
        {state.draftProposal?.diff && showDiff && (
          <DiffModal
            diff={state.draftProposal.diff}
            triggerReason={state.draftProposal.triggerReason}
            onDismiss={() => setShowDiff(false)}
          />
        )}

        {/* AI Proposal Drawer (when draft is pending review) */}
        {state.draftProposal && (
          <AiCopilotDrawer
            proposal={state.draftProposal}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
            loading={loading}
          />
        )}

        {/* Interactive Gantt Timeline */}
        <GanttTimeline
          technicians={state.technicians}
          assignments={displayedAssignments}
          requests={state.requests}
          onSelectAssignment={setSelectedAssignment}
          onToggleTechnician={handleToggleTechnician}
          onMarkCompleted={handleMarkCompleted}
          isDiffMode={Boolean(state.draftProposal?.diff)}
          diffData={state.draftProposal?.diff}
        />

        {/* Bottom Tab Panels (Backlog, Mock Notifications, Audit Ledger) */}
        <AuditNotificationTabs
          requests={state.requests}
          assignments={displayedAssignments}
          notifications={state.notifications}
          auditLogs={state.auditLogs}
          onOpenCreateOrder={() => setIsCreateOrderOpen(true)}
          onLoadBenchmark={() => handleSelectScenario('BASELINE')}
        />
      </main>

      {/* Manual Override & Assignment Detail Modal */}
      {selectedAssignment && (
        <OverrideModal
          assignment={selectedAssignment}
          technicians={state.technicians}
          requests={state.requests}
          onClose={() => setSelectedAssignment(null)}
          onSaveOverride={handleSaveOverride}
        />
      )}

      {/* Create Custom Work Order Modal */}
      <CreateWorkOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onSubmit={handleCreateRequest}
      />

      {/* Reviewer Preset Scenarios Modal */}
      <ScenarioPresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectScenario={handleSelectScenario}
        loading={loading}
      />
    </div>
  );
};

export default App;
