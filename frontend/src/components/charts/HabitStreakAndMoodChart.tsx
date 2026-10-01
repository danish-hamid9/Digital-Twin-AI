'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { HabitTrendPoint, SleepBucket } from '@/lib/types';
import { Moon, Smile, Flame, Activity, CheckCircle2 } from 'lucide-react';

interface HabitStreakAndMoodChartProps {
  trendData: HabitTrendPoint[];
  sleepBuckets: SleepBucket[];
  targetSleep?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sleep = payload.find((p: any) => p.dataKey === 'sleep_hours')?.value || 0;
    const mood = payload.find((p: any) => p.dataKey === 'mood')?.value || 0;
    const exercise = payload.find((p: any) => p.dataKey === 'exercise_minutes')?.value || 0;
    const item = payload[0].payload;

    return (
      <div className="p-3 bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl shadow-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-semibold text-stone-800 dark:text-stone-200 border-b border-[#E6DFD3] dark:border-[#2D2721] pb-1 font-mono">
          {label}
        </div>
        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
          <span className="flex items-center gap-1 font-medium">
            <Moon className="w-3 h-3" /> Sleep Duration:
          </span>
          <span className="font-mono font-bold">{sleep} hrs</span>
        </div>
        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
          <span className="flex items-center gap-1 font-medium">
            <Smile className="w-3 h-3" /> Vitality / Mood:
          </span>
          <span className="font-mono font-bold">{mood} / 5</span>
        </div>
        <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
          <span className="flex items-center gap-1 font-medium">
            <Activity className="w-3 h-3" /> Exercise:
          </span>
          <span className="font-mono font-bold">{exercise} mins</span>
        </div>
        {item.habit && (
          <div className="border-t border-[#E6DFD3] dark:border-[#2D2721] pt-1 flex items-center justify-between text-[11px]">
            <span className="text-stone-500 dark:text-stone-400 truncate">{item.habit}:</span>
            <span className={item.done ? 'text-teal-600 dark:text-teal-400 font-semibold' : 'text-stone-400'}>
              {item.done ? 'Completed' : 'Missed'}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function HabitStreakAndMoodChart({
  trendData,
  sleepBuckets,
  targetSleep = 7.5,
}: HabitStreakAndMoodChartProps) {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="h-64 rounded-2xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col items-center justify-center p-6 text-center text-stone-500 text-xs">
        <Moon className="w-8 h-8 text-stone-400 mb-2 stroke-1" />
        <p>No habit or wellbeing logs in this date range.</p>
        <p className="text-[11px] text-stone-400 mt-0.5">Log daily sleep, mood, and habits to view recovery trends.</p>
      </div>
    );
  }

  const formattedData = trendData.map((d) => ({
    ...d,
    displayDate: d.date.length > 5 ? d.date.slice(5) : d.date,
  }));

  return (
    <div className="space-y-6">
      {/* Dual Axis Trend Chart */}
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid stroke="#E6DFD3" strokeDasharray="3 3" vertical={false} opacity={0.6} />

            <XAxis
              dataKey="displayDate"
              stroke="#78716C"
              tick={{ fill: '#78716C', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#E6DFD3' }}
            />

            {/* Left Axis: Sleep Hours */}
            <YAxis
              yAxisId="sleepAxis"
              orientation="left"
              domain={[0, 12]}
              stroke="#4F46E5"
              tick={{ fill: '#4F46E5', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}h`}
            />

            {/* Right Axis: Mood (1-5) */}
            <YAxis
              yAxisId="moodAxis"
              orientation="right"
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              stroke="#D97706"
              tick={{ fill: '#D97706', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `★${val}`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', color: '#78716C' }}
            />

            <Line
              yAxisId="sleepAxis"
              type="monotone"
              dataKey="sleep_hours"
              name="Sleep (Hours)"
              stroke="#4F46E5"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#4F46E5', stroke: '#312E81', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#818CF8' }}
            />

            <Line
              yAxisId="moodAxis"
              type="monotone"
              dataKey="mood"
              name="Mood (1-5)"
              stroke="#D97706"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#D97706', stroke: '#78350F', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#F59E0B' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sleep vs Mood Correlation Buckets */}
      {sleepBuckets && sleepBuckets.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              Sleep vs. Mood Correlation Heatmap
            </span>
            <span className="text-[11px] text-stone-500 font-mono">
              Target: {targetSleep}h / night
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {sleepBuckets.map((b) => {
              const moodScore = b.avg_mood;
              const isHighMood = moodScore >= 4.0;
              const isModerate = moodScore >= 3.0 && moodScore < 4.0;

              return (
                <div
                  key={b.range_label}
                  className="p-3 rounded-xl bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] flex flex-col justify-between"
                >
                  <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 font-mono mb-1">
                    {b.range_label}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span
                      className={`text-lg font-bold font-mono ${
                        isHighMood
                          ? 'text-teal-600 dark:text-teal-400'
                          : isModerate
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      ★ {b.count > 0 ? b.avg_mood.toFixed(1) : '—'}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {b.count} day{b.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
