import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Clock, User } from 'lucide-react';
import { Assignment, Technician, ServiceRequest, ValidationViolation } from '../types';
import { api } from '../services/api';
import { CustomTimePicker } from './CustomTimePicker';

interface OverrideModalProps {
  assignment: Assignment | null;
  technicians: Technician[];
  requests: ServiceRequest[];
  onClose: () => void;
  onSaveOverride: (
    assignmentId: string,
    technicianId: string,
    startTime: string,
    endTime: string,
    overrideReason: string
  ) => Promise<void>;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  assignment,
  technicians,
  requests,
  onClose,
  onSaveOverride,
}) => {
  if (!assignment) return null;

  const request = requests.find(r => r.id === assignment.serviceRequestId);
  const isCompleted = assignment.status === 'COMPLETED' || assignment.lockState === 'LOCKED_COMPLETED';

  const [techId, setTechId] = useState(assignment.technicianId);
  const [startTime, setStartTime] = useState(assignment.startTime);
  const [endTime, setEndTime] = useState(assignment.endTime);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [violations, setViolations] = useState<ValidationViolation[]>([]);

  // Automatically recalculate end time when start time changes based on duration
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const [h, m] = newStart.split(':').map(Number);
    const totalMins = h * 60 + m + assignment.durationMinutes;
    const endH = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const endM = (totalMins % 60).toString().padStart(2, '0');
    setEndTime(`${endH}:${endM}`);
  };

  // Pre-flight deterministic validation on change
  useEffect(() => {
    let active = true;
    const validate = async () => {
      setValidating(true);
      try {
        const res = await api.validateAssignment({
          serviceRequestId: assignment.serviceRequestId,
          technicianId: techId,
          startTime,
          endTime,
        });
        if (active) {
          setViolations(res.violations);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setValidating(false);
      }
    };

    validate();
    return () => {
      active = false;
    };
  }, [assignment.serviceRequestId, techId, startTime, endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (violations.length > 0 || !reason.trim()) return;

    setLoading(true);
    try {
      await onSaveOverride(assignment.id, techId, startTime, endTime, reason.trim());
      onClose();
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#102025]/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#DAD3C9] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#DAD3C9] flex items-center justify-between bg-[#FBF8F1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#07171D] text-[#FFFDF8] flex items-center justify-center">
              <User className="w-4 h-4 text-[#A9DFCB]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#102025]">
                Assignment Detail & Manual Override
              </h3>
              <p className="text-[11px] text-[#6B675E]">Real-time Deterministic Validation Guardrails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6B675E] hover:text-[#102025] hover:bg-[#F2EDE3] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Work order metadata */}
          <div className="bg-[#F2EDE3]/70 border border-[#DAD3C9] rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="font-bold text-[#102025] text-sm">{assignment.serviceRequestId}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#DAD3C9] text-[#102025] font-semibold text-[10px]">
                {request?.requiredSkill} &bull; {request?.region} Region
              </span>
            </div>
            <p className="text-[#102025] font-medium text-xs">{request?.customerName}</p>
            <div className="text-[11px] text-[#6B675E] flex items-center gap-2 pt-1 border-t border-[#DAD3C9]/60">
              <Clock className="w-3.5 h-3.5 text-[#102025]" />
              <span>Customer Window: <strong>{request?.windowStart}–{request?.windowEnd}</strong></span>
              <span>&bull; Duration: <strong>{assignment.durationMinutes}m</strong></span>
            </div>
          </div>

          {isCompleted ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Work Order Completed (Permanently Locked)</p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Boots-on-the-ground reality is frozen. Completed assignments cannot be altered or moved by any automated replan or manual override.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Technician Selector */}
              <div>
                <label className="block text-[#102025] font-medium mb-1.5">Assigned Field Technician</label>
                <select
                  value={techId}
                  onChange={e => setTechId(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DAD3C9] rounded-lg p-2.5 text-[#102025] font-medium focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] focus:border-[#102025]"
                >
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.region} &bull; {t.skills.join(', ')} &bull; {t.shiftStart}–{t.shiftEnd})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Pickers (Custom selector replaces ugly native time input) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#102025] font-medium mb-1.5">Start Time (15-min Slot)</label>
                  <CustomTimePicker
                    value={startTime}
                    onChange={handleStartTimeChange}
                  />
                </div>
                <div>
                  <label className="block text-[#102025] font-medium mb-1.5">End Time (Calculated)</label>
                  <div className="flex items-center px-3 py-2 rounded-lg bg-[#F2EDE3] border border-[#DAD3C9] text-xs font-mono font-bold text-[#102025]">
                    <Clock className="w-3.5 h-3.5 text-[#6B675E] mr-2" />
                    <span>{endTime}</span>
                    <span className="text-[10px] text-[#6B675E] ml-auto font-sans font-normal">+{assignment.durationMinutes}m</span>
                  </div>
                </div>
              </div>

              {/* Override Reason */}
              <div>
                <label className="block text-[#102025] font-medium mb-1.5">Dispatcher Reason for Override *</label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested gate code delay"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DAD3C9] rounded-lg p-2.5 text-[#102025] focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] focus:border-[#102025]"
                  required
                />
              </div>

              {/* Real-time Validation Feedback */}
              <div className="pt-1">
                {violations.length === 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Deterministic Check Passed: Proposed assignment satisfies all 7 hard constraints.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-red-700">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{violations.length} Hard Constraint Violation(s)</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-800">
                      {violations.map((v, i) => (
                        <li key={i}>{v.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DAD3C9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#DAD3C9] text-[#6B675E] hover:text-[#102025] hover:bg-[#F2EDE3] font-medium transition-colors"
            >
              Cancel
            </button>
            {!isCompleted && (
              <button
                type="submit"
                disabled={violations.length > 0 || !reason.trim() || loading}
                className="px-5 py-2 rounded-lg bg-[#07171D] text-[#FFFDF8] font-medium hover:bg-[#102025] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Saving Override...' : 'Commit Manual Override'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
