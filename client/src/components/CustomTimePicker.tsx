import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  disabled?: boolean;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Standard operational 15-minute time slots from 08:00 to 17:00
  const slots: string[] = [];
  for (let h = 8; h <= 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m > 0) break;
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }

  const [currentH, currentM] = (value || '09:00').split(':');

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#DAD3C9] text-xs font-mono text-[#102025] hover:border-[#102025]/50 focus:outline-none focus:ring-2 focus:ring-[#A9DFCB] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#6B675E]" />
          <span className="font-semibold text-sm">{value || 'Select Time'}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#6B675E] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-[#FFFFFF] border border-[#DAD3C9] rounded-xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[11px] font-sans font-medium text-[#6B675E] mb-2 px-1 flex items-center justify-between">
            <span>Operating Shift Slots</span>
            <span className="font-mono text-[10px]">15-min increments</span>
          </div>

          {/* Quick slot grid */}
          <div className="max-h-48 overflow-y-auto grid grid-cols-3 gap-1.5 p-1">
            {slots.map(slot => {
              const isSelected = slot === value;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    onChange(slot);
                    setIsOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-[#07171D] text-[#FFFDF8] shadow-sm font-semibold'
                      : 'bg-[#F2EDE3]/70 hover:bg-[#A9DFCB]/40 text-[#102025]'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
