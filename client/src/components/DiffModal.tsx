import React from 'react';
import { Layers, ArrowRight, ShieldCheck, Flame, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';
import { ScheduleDiff } from '../types';

interface DiffModalProps {
  diff: ScheduleDiff;
  triggerReason?: string;
  onDismiss: () => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({ diff, triggerReason, onDismiss }) => {
  return (
    <div className="bg-[#FFFFFF] border border-[#DAD3C9] rounded-2xl p-5 shadow-lg space-y-3.5">
      <div className="flex items-center justify-between border-b border-[#DAD3C9] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#102025]" />
          <h4 className="text-xs font-bold text-[#102025] uppercase tracking-wider">
            Schedule Replan Diff — {triggerReason || 'Operational Disruption'}
          </h4>
        </div>
        <button
          onClick={onDismiss}
          className="text-xs font-medium text-[#6B675E] hover:text-[#102025] hover:underline"
        >
          Hide Diff
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {/* Unchanged / Locked */}
        <div className="bg-[#FBF8F1] border border-[#DAD3C9] rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-[#2A6E57] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>UNCHANGED ({diff.unchanged.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {diff.unchanged.map(id => (
              <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono font-semibold">
                {id}
              </span>
            ))}
          </div>
        </div>

        {/* Newly Assigned */}
        <div className="bg-[#FBF8F1] border border-[#F4A78E] rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-[#C24D28] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span>NEWLY INSERTED ({diff.newlyAssigned.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {diff.newlyAssigned.map(id => (
              <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4A78E]/30 text-[#C24D28] font-mono font-bold">
                {id} (Emergency)
              </span>
            ))}
          </div>
        </div>

        {/* Rescheduled */}
        <div className="bg-[#FBF8F1] border border-amber-300 rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-amber-800 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span>RESCHEDULED ({diff.rescheduled.length})</span>
          </div>
          <div className="space-y-1">
            {diff.rescheduled.map((r, i) => (
              <div key={i} className="text-[10px] text-[#6B675E] font-mono flex items-center gap-1">
                <span className="font-bold text-[#102025]">{r.serviceRequestId}:</span>
                <span>{r.oldStart}</span>
                <ArrowRight className="w-2.5 h-2.5" />
                <span className="text-[#C24D28] font-bold">{r.newStart}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reassigned */}
        <div className="bg-[#FBF8F1] border border-purple-300 rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-purple-800 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>REASSIGNED ({diff.reassigned.length})</span>
          </div>
          <div className="space-y-1">
            {diff.reassigned.length === 0 ? (
              <span className="text-[10px] text-[#6B675E] italic">0</span>
            ) : (
              diff.reassigned.map((r, i) => (
                <div key={i} className="text-[10px] text-[#6B675E] font-mono">
                  {r.serviceRequestId}: {r.fromTechId} &rarr; {r.toTechId}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unassigned */}
        <div className="bg-[#FBF8F1] border border-[#DAD3C9] rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-[#6B675E] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#C24D28]" />
            <span>UNASSIGNED ({diff.unassigned.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {diff.unassigned.map(id => (
              <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2EDE3] text-[#6B675E] font-mono font-semibold">
                {id}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
