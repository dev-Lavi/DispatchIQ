import React, { useState } from 'react';
import { X, PlusCircle, Clock, MapPin, Wrench, AlertCircle, FileText } from 'lucide-react';
import { Region, Skill, Priority } from '../types';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    customerName: string;
    region: Region;
    requiredSkill: Skill;
    priority: Priority;
    durationMinutes: number;
    windowStart: string;
    windowEnd: string;
    notes?: string;
  }) => Promise<void>;
}

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [region, setRegion] = useState<Region>('North');
  const [requiredSkill, setRequiredSkill] = useState<Skill>('HVAC');
  const [priority, setPriority] = useState<Priority>('HIGH');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [windowStart, setWindowStart] = useState('09:00');
  const [windowEnd, setWindowEnd] = useState('12:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Please provide a customer or facility name.');
      return;
    }

    if (windowStart >= windowEnd) {
      setError('Preferred window end time must be after the start time.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        customerName: customerName.trim(),
        region,
        requiredSkill,
        priority,
        durationMinutes: Number(durationMinutes),
        windowStart,
        windowEnd,
        notes: notes.trim() || undefined,
      });
      // Reset form
      setCustomerName('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102025]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFFFF] border border-[#DAD3C9] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DAD3C9] bg-[#FBF8F1]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#A9DFCB]/30 text-[#102025]">
              <PlusCircle className="w-5 h-5 text-[#294047]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#102025]">Create New Work Order</h2>
              <p className="text-xs text-[#6B675E]">Assign custom service demand into the operating day</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B675E] hover:text-[#102025] hover:bg-[#F2EDE3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-[#C24D28] bg-[#F4A78E]/20 border border-[#F4A78E] rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer / Site */}
          <div>
            <label className="block text-xs font-semibold text-[#102025] mb-1">
              Customer / Facility Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex BioTech Labs"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1]"
            />
          </div>

          {/* Region & Skill Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#102025] mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#6B675E]" />
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full px-3 py-2 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1]"
              >
                <option value="North">North (Carlos, Elena)</option>
                <option value="South">South (Maria)</option>
                <option value="Central">Central (David)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#102025] mb-1">
                <Wrench className="w-3.5 h-3.5 text-[#6B675E]" />
                Required Skill
              </label>
              <select
                value={requiredSkill}
                onChange={(e) => setRequiredSkill(e.target.value as Skill)}
                className="w-full px-3 py-2 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1]"
              >
                <option value="HVAC">HVAC</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
              </select>
            </div>
          </div>

          {/* Priority & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#102025] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1]"
              >
                <option value="EMERGENCY">EMERGENCY (Preempts others)</option>
                <option value="HIGH">HIGH Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="LOW">LOW Priority</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#102025] mb-1">
                <Clock className="w-3.5 h-3.5 text-[#6B675E]" />
                Duration (mins)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1]"
              >
                <option value={30}>30 mins</option>
                <option value={60}>60 mins (1.0 hr)</option>
                <option value={90}>90 mins (1.5 hrs)</option>
                <option value={120}>120 mins (2.0 hrs)</option>
                <option value={150}>150 mins (2.5 hrs)</option>
              </select>
            </div>
          </div>

          {/* Customer Service Window */}
          <div>
            <label className="block text-xs font-semibold text-[#102025] mb-1">
              Customer Preferred Window (08:00 – 17:00)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[#6B675E] block mb-0.5">Start Window</span>
                <input
                  type="time"
                  step="900"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1]"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#6B675E] block mb-0.5">End Window</span>
                <input
                  type="time"
                  step="900"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1]"
                />
              </div>
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-[#102025] mb-1">
              <FileText className="w-3.5 h-3.5 text-[#6B675E]" />
              Operational Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Roof access code #4419; check cooling tower pressure"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DAD3C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] bg-[#FBF8F1] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DAD3C9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#6B675E] hover:text-[#102025] hover:bg-[#F2EDE3] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-[#FFFDF8] bg-[#07171D] hover:bg-[#102025] rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
