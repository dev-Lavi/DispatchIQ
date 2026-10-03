import React from 'react';
import { Sparkles, AlertOctagon, RotateCcw, ShieldCheck, Clock, Layers, PlusCircle, Play } from 'lucide-react';
import { Schedule, ScheduleVersion } from '../types';

interface HeaderProps {
  schedule: Schedule;
  currentVersion?: ScheduleVersion;
  versions: ScheduleVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (id: string | null) => void;
  onGeneratePlan: () => void;
  onIngestEmergency: () => void;
  onResetDemo: () => void;
  onOpenCreateOrder: () => void;
  onOpenPresets: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  schedule,
  currentVersion,
  versions,
  selectedVersionId,
  onSelectVersion,
  onGeneratePlan,
  onIngestEmergency,
  onResetDemo,
  onOpenCreateOrder,
  onOpenPresets,
  loading,
}) => {
  const isViewingHistorical = selectedVersionId && selectedVersionId !== currentVersion?.id;

  return (
    <header className="bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#DAD3C9] px-6 py-3.5 sticky top-0 z-40 shadow-sm">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Context */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="DispatchIQ Logo"
              className="w-10 h-10 rounded-xl object-cover border border-[#294047] shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#102025] tracking-tight">DispatchIQ</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#F2EDE3] border border-[#DAD3C9] text-[#102025] font-semibold">
                  Field Service Replanner
                </span>
              </div>
              <p className="text-xs text-[#6B675E]">Deterministic Guardrails &bull; Human-in-the-Loop</p>
            </div>
          </div>

          <div className="hidden md:block h-7 w-px bg-[#DAD3C9]" />

          {/* Operational Day & Version Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FBF8F1] border border-[#DAD3C9] text-xs text-[#102025] font-medium shadow-sm">
              <Clock className="w-3.5 h-3.5 text-[#102025]" />
              <span>Oct 15, 2026 &bull; 08:00–17:00</span>
            </div>

            {/* Version Switcher */}
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#6B675E]" />
              <select
                className="bg-[#FFFFFF] text-xs font-medium border border-[#DAD3C9] rounded-lg px-3 py-1.5 text-[#102025] focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] shadow-sm"
                value={selectedVersionId || currentVersion?.id || ''}
                onChange={e => onSelectVersion(e.target.value === currentVersion?.id ? null : e.target.value)}
              >
                {versions.length === 0 ? (
                  <option value="">No Active Version (Draft Plan)</option>
                ) : (
                  versions.map(v => (
                    <option key={v.id} value={v.id}>
                      Version {v.versionNumber} {v.id === currentVersion?.id ? '(ACTIVE)' : `(${v.status})`}
                    </option>
                  ))
                )}
              </select>

              {isViewingHistorical && (
                <button
                  onClick={() => onSelectVersion(null)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#F4A78E]/20 border border-[#F4A78E] text-[#C24D28] font-medium hover:bg-[#F4A78E]/30 transition-colors shadow-sm"
                >
                  Return to Active
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenPresets}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FBF8F1] border border-[#DAD3C9] text-[#102025] font-semibold text-xs hover:bg-[#F2EDE3] active:scale-95 transition-all shadow-sm disabled:opacity-50"
            title="Choose from 3 reviewer demo scenarios"
          >
            <Play className="w-3.5 h-3.5 text-[#294047]" />
            <span>Scenarios</span>
          </button>

          <button
            onClick={onOpenCreateOrder}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#A9DFCB]/30 border border-[#A9DFCB] text-[#102025] font-semibold text-xs hover:bg-[#A9DFCB]/50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            title="Create a custom service request"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#294047]" />
            <span>+ Work Order</span>
          </button>

          <button
            onClick={onGeneratePlan}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#07171D] text-[#FFFDF8] font-medium text-xs hover:bg-[#102025] active:scale-95 transition-all shadow-md disabled:opacity-50"
            title="Query AI planning agent to generate optimal assignments"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#A9DFCB]" />
            <span>{loading ? 'Analyzing...' : 'Generate AI Plan'}</span>
          </button>

          <button
            onClick={onIngestEmergency}
            disabled={loading}
            className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4A78E]/25 border border-[#F4A78E] text-[#C24D28] font-semibold text-xs hover:bg-[#F4A78E]/40 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            title="Simulate incoming emergency plumbing ticket at St. Jude Hospital"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>+ Emergency</span>
          </button>

          <button
            onClick={onResetDemo}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#DAD3C9] text-[#6B675E] font-medium text-xs hover:text-[#102025] hover:bg-[#F2EDE3] active:scale-95 transition-all shadow-sm"
            title="Reset dataset back to 4 technicians and 10 baseline requests"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
