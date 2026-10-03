import React from 'react';
import { X, Play, AlertOctagon, UserX, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ScenarioPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenarioId: 'BASELINE' | 'EMERGENCY' | 'TECH_SICK') => Promise<void>;
  loading: boolean;
}

export const ScenarioPresetsModal: React.FC<ScenarioPresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102025]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFFFF] border border-[#DAD3C9] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DAD3C9] bg-[#FBF8F1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#07171D] text-[#A9DFCB]">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#102025]">Reviewer Demo Scenarios</h2>
              <p className="text-xs text-[#6B675E]">Pre-configured operational challenges to test agent capabilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B675E] hover:text-[#102025] hover:bg-[#F2EDE3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios List */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Scenario 1 */}
          <div className="border border-[#DAD3C9] rounded-xl p-4 hover:border-[#102025] hover:shadow-md transition-all bg-[#FBF8F1]/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#A9DFCB]/40 text-[#102025] mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#102025] uppercase tracking-wide">
                    Scenario 1: Baseline Morning Optimization
                  </h3>
                  <p className="text-xs text-[#6B675E] mt-1">
                    4 Technicians, 10 Service Requests across 3 regions.
                  </p>
                  <div className="mt-2 text-[11px] text-[#294047] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#294047]" />
                      <span>Validates skill, region, and shift boundaries.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#C24D28]" />
                      <span>Intelligently flags <strong>SR-110</strong> (North Hills) as unassignable due to technician daily workload cap.</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={async () => {
                  await onSelectScenario('BASELINE');
                  onClose();
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#07171D] text-[#FFFDF8] hover:bg-[#102025] transition-all shadow-sm disabled:opacity-50"
              >
                Load Scenario 1
              </button>
            </div>
          </div>

          {/* Scenario 2 */}
          <div className="border border-[#DAD3C9] rounded-xl p-4 hover:border-[#F4A78E] hover:shadow-md transition-all bg-[#F4A78E]/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#F4A78E]/30 text-[#C24D28] mt-0.5">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#C24D28] uppercase tracking-wide">
                    Scenario 2: Intraday Emergency Preemption
                  </h3>
                  <p className="text-xs text-[#6B675E] mt-1">
                    Mid-day burst: Critical water leak arrives at <strong>St. Jude Hospital ICU</strong> (Plumbing, 11:00–13:00).
                  </p>
                  <div className="mt-2 text-[11px] text-[#294047] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#294047]" />
                      <span>Preempts lower-priority tasks to guarantee emergency SLA.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#294047]" />
                      <span>Enforces <strong>Immutable Lock</strong> on already completed morning work orders.</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={async () => {
                  await onSelectScenario('EMERGENCY');
                  onClose();
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C24D28] text-[#FFFFFF] hover:bg-[#A93C19] transition-all shadow-sm disabled:opacity-50"
              >
                Load Scenario 2
              </button>
            </div>
          </div>

          {/* Scenario 3 */}
          <div className="border border-[#DAD3C9] rounded-xl p-4 hover:border-[#6B675E] hover:shadow-md transition-all bg-[#FBF8F1]/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#DAD3C9] text-[#102025] mt-0.5">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#102025] uppercase tracking-wide">
                    Scenario 3: Technician Absence / Sick Leave
                  </h3>
                  <p className="text-xs text-[#6B675E] mt-1">
                    Simulates technician <strong>Maria Santos (South Region)</strong> calling out sick midday.
                  </p>
                  <div className="mt-2 text-[11px] text-[#294047] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#294047]" />
                      <span>Triggers automatic disruption replanning.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#C24D28]" />
                      <span>Surfaces trade-offs: highlights tasks that cannot be reassigned due to regional territorial constraints.</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={async () => {
                  await onSelectScenario('TECH_SICK');
                  onClose();
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#294047] text-[#FFFDF8] hover:bg-[#102025] transition-all shadow-sm disabled:opacity-50"
              >
                Load Scenario 3
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#FBF8F1] border-t border-[#DAD3C9] flex items-center justify-between">
          <span className="text-[11px] text-[#6B675E]">
            Tip: You can also create custom orders using <strong>"+ Work Order"</strong> in the top header.
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-[#6B675E] hover:text-[#102025] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
