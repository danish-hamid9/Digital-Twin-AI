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
      <div className="p-3 bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl shadow-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-semibold text-stone-800 dark:text-stone-200 border-b border-[#E6DFD3] dark:border-[#2D2721] pb-1 font-mono">
          {label}
        </div>
        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
          <span className="flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> Focus Time:
          </span>
          <span className="font-mono font-bold">{hours} hrs</span>
        </div>
        {score !== null && score !== undefined && (
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
            <span className="flex items-center gap-1 font-medium">
              <Award className="w-3 h-3" /> Exam / Quiz:
            </span>
            <span className="font-mono font-bold">{score}%</span>
          </div>
        )}
        {item.subject && (
          <div className="border-t border-[#E6DFD3] dark:border-[#2D2721] pt-1 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="text-stone-400 dark:text-stone-500">Subjects:</span> {item.subject}
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
      <div className="h-64 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col items-center justify-center p-6 text-center text-stone-500 text-xs">
        <GraduationCap className="w-8 h-8 text-stone-400 mb-2 stroke-1" />
        <p>No study sessions recorded in this time range.</p>
        <p className="text-[11px] text-stone-400 mt-0.5">Log study sessions to visualize hours vs assessment score trajectories.</p>
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
              <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#E6DFD3" strokeDasharray="3 3" vertical={false} opacity={0.6} />

          <XAxis
            dataKey="displayDate"
            stroke="#78716C"
            tick={{ fill: '#78716C', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#E6DFD3' }}
          />

          {/* Left Axis: Study Hours */}
          <YAxis
            yAxisId="hoursAxis"
            orientation="left"
            stroke="#4F46E5"
            tick={{ fill: '#4F46E5', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}h`}
          />

          {/* Right Axis: Assessment Score % */}
          <YAxis
            yAxisId="scoreAxis"
            orientation="right"
            domain={[0, 100]}
            stroke="#0D9488"
            tick={{ fill: '#0D9488', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}%`}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', color: '#78716C' }}
          />

          <Area
            yAxisId="hoursAxis"
            type="monotone"
            dataKey="hours"
            name="Study Hours"
            fill="url(#studyHoursGradient)"
            stroke="#4F46E5"
            strokeWidth={2}
          />

          <Line
            yAxisId="scoreAxis"
            type="monotone"
            dataKey="score"
            name="Assessment Score %"
            stroke="#0D9488"
            strokeWidth={2.5}
            connectNulls
            dot={{ r: 4, fill: '#0D9488', stroke: '#115E59', strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: '#14B8A6' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
