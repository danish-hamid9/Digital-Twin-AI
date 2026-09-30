'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { StudyTrendPoint } from '@/lib/types';
import { GraduationCap, Award, Clock } from 'lucide-react';

interface StudyTrendChartProps {
  data: StudyTrendPoint[];
  avgScore?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const hours = payload.find((p: any) => p.dataKey === 'hours')?.value || 0;
    const scoreItem = payload.find((p: any) => p.dataKey === 'score');
    const score = scoreItem && scoreItem.value !== undefined ? scoreItem.value : null;
    const item = payload[0].payload;

    return (
      <div className="p-3 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-semibold text-slate-300 border-b border-slate-800/80 pb-1 font-mono">
          {label}
        </div>
        <div className="flex items-center justify-between text-indigo-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Focus Time:
          </span>
          <span className="font-mono font-bold">{hours} hrs</span>
        </div>
        {score !== null && score !== undefined && (
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3" /> Exam / Quiz Score:
            </span>
            <span className="font-mono font-bold">{score}%</span>
          </div>
        )}
        {item.subject && (
          <div className="border-t border-slate-800/80 pt-1 text-[11px] text-slate-400">
            <span className="text-slate-500">Subjects:</span> {item.subject}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function StudyTrendChart({ data, avgScore }: StudyTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
        <GraduationCap className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
        <p>No study sessions recorded in this time range.</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Log study sessions to visualize hours vs assessment score trajectories.</p>
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    displayDate: d.date.length > 5 ? d.date.slice(5) : d.date,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="studyHoursGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="displayDate"
            stroke="#64748B"
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />

          {/* Left Axis: Study Hours */}
          <YAxis
            yAxisId="hoursAxis"
            orientation="left"
            stroke="#818CF8"
            tick={{ fill: '#818CF8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}h`}
          />

          {/* Right Axis: Assessment Score % */}
          <YAxis
            yAxisId="scoreAxis"
            orientation="right"
            domain={[0, 100]}
            stroke="#10B981"
            tick={{ fill: '#10B981', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}%`}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', color: '#94A3B8' }}
          />

          <Area
            yAxisId="hoursAxis"
            type="monotone"
            dataKey="hours"
            name="Study Hours"
            fill="url(#studyHoursGradient)"
            stroke="#6366F1"
            strokeWidth={2}
          />

          <Line
            yAxisId="scoreAxis"
            type="monotone"
            dataKey="score"
            name="Assessment Score %"
            stroke="#10B981"
            strokeWidth={2.5}
            connectNulls
            dot={{ r: 4, fill: '#10B981', stroke: '#064E3B', strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: '#34D399' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
