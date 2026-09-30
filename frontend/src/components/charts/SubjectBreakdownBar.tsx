'use client';

import React from 'react';
import { SubjectBreakdown } from '@/lib/types';
import { BookOpen } from 'lucide-react';

interface SubjectBreakdownProps {
  data: SubjectBreakdown[];
  totalHours?: number;
}

const SUBJECT_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#38BDF8', // Sky
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#A855F7', // Violet
];

export default function SubjectBreakdownBar({
  data,
  totalHours = 0,
}: SubjectBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
        <BookOpen className="w-7 h-7 text-slate-600 mb-1.5 stroke-1" />
        <p>No subjects logged in this time range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
        return (
          <div key={item.subject} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-white font-medium">{item.subject}</span>
                <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {item.sessions_count} session{item.sessions_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {item.avg_score !== null && item.avg_score !== undefined && (
                  <span className="text-[11px] font-mono font-semibold text-emerald-400">
                    Avg: {item.avg_score}%
                  </span>
                )}
                <span className="font-mono text-slate-300 font-bold">
                  {item.hours}h
                </span>
                <span className="font-mono text-slate-400 text-[11px] w-9 text-right font-medium">
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
