import React from 'react';
import { Lock, CheckCircle2, UserX, UserCheck, Flame } from 'lucide-react';
import { Technician, Assignment, ServiceRequest, ProposedAssignment } from '../types';

interface GanttTimelineProps {
  technicians: Technician[];
  assignments: Assignment[];
  requests: ServiceRequest[];
  draftAssignments?: ProposedAssignment[];
  onSelectAssignment: (assignment: Assignment) => void;
  onToggleTechnician: (techId: string, currentStatus: boolean) => void;
  onMarkCompleted: (requestId: string) => void;
  isDiffMode?: boolean;
  diffData?: any;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  technicians,
  assignments,
  requests,
  onSelectAssignment,
  onToggleTechnician,
  onMarkCompleted,
  isDiffMode,
  diffData,
}) => {
  // Timeline bounds: 08:00 (480 mins) to 17:00 (1020 mins) = 540 minutes
  const TIMELINE_START = 8 * 60; // 480 mins
  const TIMELINE_TOTAL = 9 * 60; // 540 mins

  // Time ticks every 30 minutes from 08:00 to 17:00
  const timeTicks: string[] = [];
  for (let m = TIMELINE_START; m <= 17 * 60; m += 30) {
    const hh = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    timeTicks.push(`${hh}:${mm}`);
  }

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const requestMap = new Map<string, ServiceRequest>();
  for (const r of requests) {
    requestMap.set(r.id, r);
  }

  // Workload calculator per tech
  const workloadByTech: Record<string, number> = {};
  for (const asgn of assignments) {
    workloadByTech[asgn.technicianId] = (workloadByTech[asgn.technicianId] || 0) + asgn.durationMinutes;
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#DAD3C9] rounded-2xl overflow-hidden shadow-md">
      {/* Header bar */}
      <div className="px-6 py-3.5 border-b border-[#DAD3C9] flex items-center justify-between bg-[#FBF8F1]/80">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#102025]">Field Operations Schedule Timeline</span>
          <span className="text-xs text-[#6B675E]">&bull; 08:00–17:00 Shift Interval</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#EBF8F4] border border-[#A9DFCB]" />
            <span className="text-[#6B675E]">Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#07171D] border border-emerald-500" />
            <span className="text-[#6B675E]">Completed (Locked)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F4A78E]/30 border border-[#F4A78E]" />
            <span className="text-[#6B675E]">Emergency Ticket</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1020px]">
          {/* Timeline Time Header */}
          <div className="grid grid-cols-[280px_1fr] border-b border-[#DAD3C9] bg-[#F2EDE3]/60 text-xs font-mono text-[#6B675E]">
            <div className="p-3 px-5 font-sans font-semibold text-[#102025] text-xs border-r border-[#DAD3C9]">
              Field Technician & Workload
            </div>
            <div className="relative h-10 flex items-center">
              {timeTicks.map((tick, i) => {
                const percent = (i / (timeTicks.length - 1)) * 100;
                return (
                  <div
                    key={tick}
                    className="absolute -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${percent}%` }}
                  >
                    <span className="font-semibold text-[11px]">{tick}</span>
                    <div className="h-1.5 w-px bg-[#DAD3C9] mt-0.5" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technician Rows */}
          <div className="divide-y divide-[#DAD3C9]/70">
            {technicians.map(tech => {
              const techAssignments = assignments.filter(a => a.technicianId === tech.id);
              const usedMinutes = workloadByTech[tech.id] || 0;
              const workloadPercent = Math.min(100, Math.round((usedMinutes / tech.maxWorkloadMinutes) * 100));

              return (
                <div
                  key={tech.id}
                  className={`grid grid-cols-[280px_1fr] hover:bg-[#FBF8F1]/60 transition-colors ${
                    !tech.isAvailable ? 'opacity-60 bg-red-50/40' : ''
                  }`}
                >
                  {/* Left Column: Technician Profile & Capacity */}
                  <div className="p-4 px-5 border-r border-[#DAD3C9] flex flex-col justify-between gap-2.5 bg-[#FFFFFF]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={tech.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={tech.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#DAD3C9] shadow-sm"
                        />
                        <div>
                          <div className="font-semibold text-xs text-[#102025] flex items-center gap-1.5">
                            <span>{tech.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F2EDE3] border border-[#DAD3C9] text-[#6B675E] font-mono">
                              {tech.region}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tech.skills.map(s => (
                              <span
                                key={s}
                                className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#EBF8F4] border border-[#A9DFCB] text-[#2A6E57] font-semibold"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Availability toggle */}
                      <button
                        onClick={() => onToggleTechnician(tech.id, tech.isAvailable)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          tech.isAvailable
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                        }`}
                        title={tech.isAvailable ? 'Click to Mark as Unavailable (Simulate Call-out)' : 'Mark as Available'}
                      >
                        {tech.isAvailable ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Workload Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] text-[#6B675E] mb-1 font-mono">
                        <span>
                          {Math.floor(usedMinutes / 60)}h {usedMinutes % 60}m / {Math.floor(tech.maxWorkloadMinutes / 60)}h
                        </span>
                        <span className={workloadPercent >= 90 ? 'text-[#C24D28] font-bold' : 'font-semibold text-[#102025]'}>
                          {workloadPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F2EDE3] rounded-full overflow-hidden border border-[#DAD3C9]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            workloadPercent >= 90
                              ? 'bg-[#C24D28]'
                              : workloadPercent >= 70
                              ? 'bg-amber-500'
                              : 'bg-[#2A6E57]'
                          }`}
                          style={{ width: `${workloadPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Track: Timeline Gantt Lane */}
                  <div className="relative h-20 p-1 flex items-center bg-[#FBF8F1]">
                    {/* Vertical grid lines */}
                    {timeTicks.map((tick, i) => {
                      const percent = (i / (timeTicks.length - 1)) * 100;
                      return (
                        <div
                          key={tick}
                          className="absolute top-0 bottom-0 w-px bg-[#DAD3C9]/40 pointer-events-none"
                          style={{ left: `${percent}%` }}
                        />
                      );
                    })}

                    {/* Assignments */}
                    {techAssignments.map(asgn => {
                      const req = requestMap.get(asgn.serviceRequestId);
                      const startMin = timeToMinutes(asgn.startTime);
                      const duration = asgn.durationMinutes;

                      // Coordinate calculation
                      const leftPercent = ((startMin - TIMELINE_START) / TIMELINE_TOTAL) * 100;
                      const widthPercent = (duration / TIMELINE_TOTAL) * 100;

                      const isCompleted = asgn.status === 'COMPLETED' || asgn.lockState === 'LOCKED_COMPLETED';
                      const isEmergency = req?.priority === 'EMERGENCY';

                      // Diff coloring if in diff mode
                      const isNewlyAssigned = diffData?.newlyAssigned?.includes(asgn.serviceRequestId);
                      const isRescheduled = diffData?.rescheduled?.some((r: any) => r.serviceRequestId === asgn.serviceRequestId);
                      const isReassigned = diffData?.reassigned?.some((r: any) => r.serviceRequestId === asgn.serviceRequestId);

                      let blockStyle = 'border-[#DAD3C9] bg-[#FFFFFF] text-[#102025] shadow-sm hover:border-[#102025]';
                      if (isCompleted) {
                        blockStyle = 'border-emerald-600 bg-[#07171D] text-[#FFFDF8] shadow-md';
                      } else if (isEmergency) {
                        blockStyle = 'border-[#F4A78E] bg-[#F4A78E]/30 text-[#C24D28] font-semibold shadow-md';
                      } else if (isNewlyAssigned) {
                        blockStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold animate-pulse';
                      } else if (isRescheduled) {
                        blockStyle = 'border-amber-400 bg-amber-50 text-amber-900 font-semibold';
                      } else if (isReassigned) {
                        blockStyle = 'border-purple-400 bg-purple-50 text-purple-900 font-semibold';
                      }

                      return (
                        <div
                          key={asgn.id}
                          onClick={() => onSelectAssignment(asgn)}
                          className={`absolute top-2 bottom-2 rounded-xl border px-3 py-1.5 cursor-pointer transition-all hover:scale-[1.01] hover:z-20 hover:shadow-lg flex flex-col justify-between group ${blockStyle}`}
                          style={{
                            left: `${Math.max(0, leftPercent)}%`,
                            width: `${Math.max(4, widthPercent)}%`,
                          }}
                          title={`Click to view/override ${asgn.serviceRequestId} (${asgn.startTime}–${asgn.endTime})`}
                        >
                          <div className="flex items-center justify-between gap-1 overflow-hidden">
                            <span className="font-mono text-[10px] font-bold tracking-tight truncate flex items-center gap-1">
                              {isCompleted && <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                              {isEmergency && <Flame className="w-2.5 h-2.5 text-[#C24D28] shrink-0" />}
                              {asgn.serviceRequestId}
                            </span>
                            <span className="text-[9px] font-mono opacity-80 shrink-0 font-medium">
                              {asgn.startTime}–{asgn.endTime}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] truncate font-medium">
                            <span className="truncate">{req?.customerName || 'Work Order'}</span>
                            
                            {/* Quick Complete Action */}
                            {!isCompleted && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onMarkCompleted(asgn.serviceRequestId);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-emerald-700 hover:text-emerald-900 transition-opacity ml-1 p-0.5 rounded hover:bg-emerald-50"
                                title="Mark Completed (Test Lock)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {techAssignments.length === 0 && (
                      <div className="text-xs text-[#6B675E] italic pl-4 font-medium">
                        {tech.isAvailable ? 'No assignments scheduled' : 'Technician unavailable'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
