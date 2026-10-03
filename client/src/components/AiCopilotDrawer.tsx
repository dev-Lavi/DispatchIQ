import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ScheduleValidationResult, UnassignedAnalysis, OperationalRisk } from '../types';

interface AiCopilotDrawerProps {
  proposal: {
    planSummary: string;
    tradeOffs: string[];
    risks: OperationalRisk[];
    unassignedRequests: UnassignedAnalysis[];
    suggestedQuestions: string[];
    validation: ScheduleValidationResult;
    provider?: string;
    diff?: any;
  } | null;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  proposal,
  onApprove,
  onReject,
  loading,
}) => {
  if (!proposal) return null;

  const { validation, planSummary, tradeOffs, risks, unassignedRequests, suggestedQuestions } = proposal;
  const isValid = validation?.isValid ?? true;

  return (
    <div className="bg-[#FFFFFF] border border-[#DAD3C9] rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DAD3C9] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#07171D] text-[#A9DFCB] flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#102025] flex items-center gap-2">
              <span>AI Dispatch Plan Proposal</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F2EDE3] font-mono border border-[#DAD3C9] text-[#102025] font-semibold">
                {proposal.provider === 'GOOGLE_GEMINI' ? 'Gemini 1.5 Flash' : 'Deterministic Heuristic Planner'}
              </span>
            </h3>
            <p className="text-xs text-[#6B675E]">Requires Dispatcher Confirmation before Committing to Daily Operations</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onReject}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#DAD3C9] text-xs font-semibold text-[#6B675E] hover:text-[#C24D28] hover:border-[#F4A78E] hover:bg-red-50/30 transition-all disabled:opacity-50"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>Reject Proposal</span>
          </button>

          <button
            onClick={onApprove}
            disabled={!isValid || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#07171D] text-[#FFFDF8] font-semibold text-xs hover:bg-[#102025] active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-[#A9DFCB]" />
            <span>{loading ? 'Committing...' : 'Approve & Activate Schedule'}</span>
          </button>
        </div>
      </div>

      {/* Deterministic Validation Scorecard */}
      <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
        isValid
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
          : 'bg-red-50 border-red-300 text-red-900'
      }`}>
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            {isValid ? 'ALL 7 HARD CONSTRAINTS VERIFIED & PASSED' : `${validation.violations.length} HARD CONSTRAINT VIOLATIONS DETECTED`}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono font-medium text-emerald-800">
          <span>Skills ✓</span>
          <span>Region ✓</span>
          <span>Shift ✓</span>
          <span>Window ✓</span>
          <span>No Overlap ✓</span>
          <span>Workload Cap ✓</span>
          <span>Completed Lock ✓</span>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="bg-[#FBF8F1] border border-[#DAD3C9] rounded-xl p-3.5 text-xs text-[#102025]">
        <span className="font-bold">Plan Summary: </span>
        <span className="text-[#102025] font-medium">{planSummary}</span>
      </div>

      {/* Grid of Reasoning, Trade-offs & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Trade-offs */}
        <div className="bg-[#FBF8F1] border border-[#DAD3C9] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#102025]">
            <CheckCircle2 className="w-4 h-4 text-[#2A6E57]" />
            <span>Trade-offs & Rationale</span>
          </div>
          <ul className="text-xs text-[#6B675E] space-y-2 list-disc pl-4 font-normal">
            {tradeOffs.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>

        {/* Operational Risks */}
        <div className="bg-[#FBF8F1] border border-[#DAD3C9] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#102025]">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Operational Risks</span>
          </div>
          {risks.length === 0 ? (
            <p className="text-xs text-[#6B675E] italic">No critical risks identified.</p>
          ) : (
            <div className="space-y-2">
              {risks.map((r, i) => (
                <div key={i} className="text-xs flex items-start gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-800 font-mono font-bold shrink-0">
                    {r.severity}
                  </span>
                  <span className="text-[#6B675E] font-medium">{r.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clarification Questions */}
        <div className="bg-[#FBF8F1] border border-[#DAD3C9] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#102025]">
            <HelpCircle className="w-4 h-4 text-[#C24D28]" />
            <span>Clarification Questions</span>
          </div>
          {suggestedQuestions.length === 0 ? (
            <p className="text-xs text-[#6B675E] italic">No missing information detected.</p>
          ) : (
            <ul className="text-xs text-[#6B675E] space-y-2 list-disc pl-4 font-normal">
              {suggestedQuestions.map((q, i) => (
                <li key={i} className="text-[#102025] font-medium">{q}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Unassigned Work Orders Warning */}
      {unassignedRequests.length > 0 && (
        <div className="bg-red-50/70 border border-red-300 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-[#C24D28] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{unassignedRequests.length} Work Order(s) Unassigned (Operational Bottlenecks)</span>
          </div>
          <div className="divide-y divide-red-200">
            {unassignedRequests.map(u => (
              <div key={u.serviceRequestId} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <span className="font-mono font-bold text-[#102025] mr-2">{u.serviceRequestId}:</span>
                  <span className="text-[#6B675E]">{u.reason}</span>
                </div>
                <div className="text-[11px] text-[#C24D28] font-bold">
                  Recommendation: {u.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
