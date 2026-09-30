'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export interface DateRangePickerProps {
  preset: string;
  startDate?: string;
  endDate?: string;
  onChange: (preset: string, start?: string, end?: string) => void;
  isLoading?: boolean;
}

const PRESETS = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'all', label: 'All History' },
  { id: 'custom', label: 'Custom' },
];

export default function DateRangePicker({
  preset,
  startDate,
  endDate,
  onChange,
  isLoading,
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(preset === 'custom');
  const [customStart, setCustomStart] = useState(
    startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState(
    endDate || new Date().toISOString().slice(0, 10)
  );

  const handlePresetClick = (pId: string) => {
    if (pId === 'custom') {
      setShowCustom(true);
      onChange('custom', customStart, customEnd);
    } else {
      setShowCustom(false);
      onChange(pId);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onChange('custom', customStart, customEnd);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Preset Pill Buttons */}
      <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
        {PRESETS.map((p) => {
          const isActive = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePresetClick(p.id)}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              } disabled:opacity-50`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers */}
      {showCustom && (
        <form
          onSubmit={handleApplyCustom}
          className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs animate-fadeIn"
        >
          <div className="flex items-center gap-1.5 pl-2 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 shadow"
          >
            <Check className="w-3 h-3" />
            <span>Apply</span>
          </button>
        </form>
      )}
    </div>
  );
}
