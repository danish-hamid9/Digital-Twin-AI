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
      <div className="p-3 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-semibold text-slate-300 border-b border-slate-800/80 pb-1 font-mono">
          {label}
        </div>
        <div className="flex items-center justify-between text-indigo-400">
          <span className="flex items-center gap-1">
            <Moon className="w-3 h-3" /> Sleep Duration:
          </span>
          <span className="font-mono font-bold">{sleep} hrs</span>
        </div>
        <div className="flex items-center justify-between text-amber-400">
          <span className="flex items-center gap-1">
            <Smile className="w-3 h-3" /> Vitality / Mood:
          </span>
          <span className="font-mono font-bold">{mood} / 5</span>
        </div>
        <div className="flex items-center justify-between text-sky-400">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" /> Exercise:
          </span>
          <span className="font-mono font-bold">{exercise} mins</span>
        </div>
        {item.habit && (
          <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 truncate">{item.habit}:</span>
            <span className={item.done ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
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
      <div className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
        <Moon className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
        <p>No habit or wellbeing logs in this date range.</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Log daily sleep, mood, and habits to view recovery trends.</p>
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
            <defs>
              <linearGradient id="exerciseBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#0284C7" stopOpacity={0.2} />
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

            {/* Left Axis: Sleep Hours */}
            <YAxis
              yAxisId="sleepAxis"
              orientation="left"
              domain={[0, 12]}
              stroke="#818CF8"
              tick={{ fill: '#818CF8', fontSize: 11 }}
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
              stroke="#F59E0B"
              tick={{ fill: '#F59E0B', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `★${val}`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', color: '#94A3B8' }}
            />

            <Line
              yAxisId="sleepAxis"
              type="monotone"
              dataKey="sleep_hours"
              name="Sleep (Hours)"
              stroke="#818CF8"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#818CF8', stroke: '#312E81', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#A5B4FC' }}
            />

            <Line
              yAxisId="moodAxis"
              type="monotone"
              dataKey="mood"
              name="Mood (1-5)"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#F59E0B', stroke: '#78350F', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#FCD34D' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sleep vs Mood Correlation Buckets */}
      {sleepBuckets && sleepBuckets.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Sleep vs. Mood Correlation Heatmap
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
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
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
                >
                  <div className="text-[11px] font-semibold text-slate-400 font-mono mb-1">
                    {b.range_label}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span
                      className={`text-lg font-bold font-mono ${
                        isHighMood
                          ? 'text-emerald-400'
                          : isModerate
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      ★ {b.count > 0 ? b.avg_mood.toFixed(1) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
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
