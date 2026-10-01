'use client';

import React from 'react';
import { SubjectBreakdown } from '@/lib/types';
import { BookOpen } from 'lucide-react';

interface SubjectBreakdownProps {
  data: SubjectBreakdown[];
  totalHours?: number;
}

const SUBJECT_COLORS = [
  '#4F46E5', // Indigo
  '#0D9488', // Teal
  '#EA580C', // Terracotta
  '#D97706', // Amber
  '#E11D48', // Rose
  '#7C3AED', // Violet
];

export default function SubjectBreakdownBar({
  data,
  totalHours = 0,
}: SubjectBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col items-center justify-center p-6 text-center text-stone-500 text-xs">
        <BookOpen className="w-7 h-7 text-stone-400 mb-1.5 stroke-1" />
        <p>No subjects logged in this time range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
        return (
          <div key={item.subject} className="p-2.5 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] hover:border-stone-400 dark:hover:border-stone-600 transition">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-stone-900 dark:text-stone-100 font-medium">{item.subject}</span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721]">
                  {item.sessions_count} session{item.sessions_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {item.avg_score !== null && item.avg_score !== undefined && (
                  <span className="text-[11px] font-mono font-semibold text-teal-600 dark:text-teal-400">
                    Avg: {item.avg_score}%
                  </span>
                )}
                <span className="font-mono text-stone-800 dark:text-stone-200 font-bold">
                  {item.hours}h
                </span>
                <span className="font-mono text-stone-500 dark:text-stone-400 text-[11px] w-9 text-right font-medium">
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#E6DFD3] dark:bg-[#2D2721] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
