'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ChartSpec } from '@/lib/types';
import { ChevronDown, ChevronUp, Database, BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';

interface InlineChatChartProps {
  spec: ChartSpec;
}

const DONUT_COLORS = [
  '#0D9488', // Teal
  '#EA580C', // Orange
  '#6366F1', // Indigo
  '#D97706', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#64748B', // Slate
];

export const InlineChatChart: React.FC<InlineChatChartProps> = ({ spec }) => {
  const [showRawData, setShowRawData] = useState(false);

  const currencySymbol = spec.currency === 'INR' ? '₹' : (spec.currency === 'EUR' ? '€' : (spec.currency === 'GBP' ? '£' : '$'));

  // Format currency or raw number
  const formatVal = (v: number) => {
    if (spec.currency) {
      return `${currencySymbol}${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    const num = Number(v);
    if (spec.unit === '%' || spec.title?.toLowerCase().includes('gauge') || spec.title?.toLowerCase().includes('prob')) {
      if (num >= 95.0) return '>95%';
      if (num <= 5.0 && num >= 0.0) return '<5%';
      return `${num.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    }
    return Number(v).toLocaleString();
  };

  // Render Simulation Fan Chart (P10 / P50 / P90 vs Baseline)
  const renderSimulationFan = () => {
    const p10Series = spec.series.find((s) => s.name.includes('P10'))?.data || [];
    const p50Series = spec.series.find((s) => s.name.includes('P50') && !s.name.includes('Baseline'))?.data || [];
    const p90Series = spec.series.find((s) => s.name.includes('P90'))?.data || [];
    const baseSeries = spec.series.find((s) => s.name.includes('Baseline'))?.data || [];

    const chartData = spec.labels.map((label, idx) => ({
      name: label,
      p10: p10Series[idx] ?? 0,
      p50: p50Series[idx] ?? 0,
      p90: p90Series[idx] ?? 0,
      baseline: baseSeries[idx] ?? 0,
    }));

    return (
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${currencySymbol}${Number(v / 1000).toFixed(0)}k`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1A17] border border-stone-200 dark:border-stone-800 shadow-md text-xs space-y-1">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{label}</div>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex justify-between gap-3 text-[11px]" style={{ color: entry.color }}>
                          <span>{entry.name}:</span>
                          <span className="font-mono font-semibold">{formatVal(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
            <Area type="monotone" dataKey="p90" name="P90 (Best Case)" stroke="#0D9488" fill="#0D9488" fillOpacity={0.12} />
            <Area type="monotone" dataKey="p10" name="P10 (Risk Case)" stroke="#EA580C" fill="#EA580C" fillOpacity={0.15} />
            <Line type="monotone" dataKey="p50" name="Median Scenario" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="baseline" name="Baseline P50" stroke="#78716C" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render Savings Forecast with Uncertainty Bands
  const renderSavingsForecast = () => {
    const lowerSeries = spec.series.find((s) => s.name.toLowerCase().includes('lower'))?.data || [];
    const expSeries = spec.series.find((s) => s.name.toLowerCase().includes('expected'))?.data || [];
    const upperSeries = spec.series.find((s) => s.name.toLowerCase().includes('upper'))?.data || [];

    const chartData = spec.labels.map((label, idx) => ({
      name: label,
      lower: lowerSeries[idx] ?? 0,
      expected: expSeries[idx] ?? 0,
      upper: upperSeries[idx] ?? 0,
    }));

    return (
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${currencySymbol}${Number(v).toFixed(0)}`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1A17] border border-stone-200 dark:border-stone-800 shadow-md text-xs space-y-1">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{label}</div>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex justify-between gap-3 text-[11px]" style={{ color: entry.color }}>
                          <span>{entry.name}:</span>
                          <span className="font-mono font-semibold">{formatVal(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
            <Area type="monotone" dataKey="upper" name="Upper Band (P90)" stroke="#6366F1" fill="#6366F1" fillOpacity={0.12} />
            <Area type="monotone" dataKey="lower" name="Lower Band (P10)" stroke="#EA580C" fill="#EA580C" fillOpacity={0.15} />
            <Line type="monotone" dataKey="expected" name="Expected Monthly Savings" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render Expense Donut Chart
  const renderExpenseDonut = () => {
    const data = spec.series.map((s, idx) => ({
      name: s.name,
      value: s.value ?? (s.data ? s.data[0] : 0),
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
    }));

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
        <div className="h-48 w-48 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    return (
                      <div className="p-2 rounded-lg bg-white dark:bg-[#1C1A17] border border-stone-200 dark:border-stone-800 shadow-md text-xs">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{item.name}</div>
                        <div className="text-stone-600 dark:text-stone-300 font-mono">
                          {formatVal(item.value)} ({pct}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] text-stone-400 font-medium">Total</span>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 font-mono">
              {formatVal(total)}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 grid grid-cols-2 gap-2 text-xs w-full">
          {data.map((item, idx) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
            return (
              <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg inner-panel">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-stone-700 dark:text-stone-300 font-medium text-[11px]">{item.name}</div>
                  <div className="text-[10px] font-mono text-stone-500">{formatVal(item.value)} ({pct}%)</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Study Score vs Sleep Dual-Axis Chart
  const renderStudyVsSleep = () => {
    const scoreSeries = spec.series.find((s) => s.name.toLowerCase().includes('score'))?.data || [];
    const sleepSeries = spec.series.find((s) => s.name.toLowerCase().includes('sleep'))?.data || [];

    const chartData = spec.labels.map((label, idx) => ({
      name: label,
      score: scoreSeries[idx] ?? 0,
      sleep: sleepSeries[idx] ?? 0,
    }));

    return (
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 12]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1A17] border border-stone-200 dark:border-stone-800 shadow-md text-xs space-y-1">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{label}</div>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex justify-between gap-3 text-[11px]" style={{ color: entry.color }}>
                          <span>{entry.name}:</span>
                          <span className="font-mono font-semibold">
                            {entry.value} {entry.name.includes('Score') ? '%' : 'hrs'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
            <Bar yAxisId="left" dataKey="score" name="Study Score (%)" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={16} />
            <Line yAxisId="right" type="monotone" dataKey="sleep" name="Sleep (Hours)" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render Habit & Burnout Gauges
  const renderHabitBurnoutGauge = () => {
    const burnout = spec.series.find((s) => s.name.toLowerCase().includes('burnout'))?.value ?? 0;
    const streakProb = spec.series.find((s) => s.name.toLowerCase().includes('streak') || s.name.toLowerCase().includes('continuity'))?.value ?? 0;

    const getBurnoutColor = (val: number) => {
      if (val < 40) return { bg: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', label: 'Low Risk' };
      if (val < 70) return { bg: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', label: 'Moderate' };
      return { bg: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', label: 'Elevated Risk' };
    };

    const getStreakColor = (val: number) => {
      if (val >= 70) return { bg: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-400', label: 'High Resilience' };
      if (val >= 45) return { bg: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', label: 'Moderate' };
      return { bg: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', label: 'Fragile' };
    };

    const bStyle = getBurnoutColor(burnout);
    const sStyle = getStreakColor(streakProb);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Burnout Risk Card */}
        <div className="inner-panel p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-stone-500" />
              <span>Burnout Risk Index</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bStyle.text} bg-stone-100 dark:bg-stone-800`}>
              {bStyle.label}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-stone-900 dark:text-stone-100 font-mono">
              {burnout.toFixed(1)}%
            </span>
            <span className="text-[10px] text-stone-400">Target &lt; 40%</span>
          </div>

          <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${bStyle.bg} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, burnout))}%` }}
            />
          </div>
        </div>

        {/* Streak Continuity Card */}
        <div className="inner-panel p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-stone-500" />
              <span>Habit Continuity Probability</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sStyle.text} bg-stone-100 dark:bg-stone-800`}>
              {sStyle.label}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-stone-900 dark:text-stone-100 font-mono">
              {streakProb >= 95 ? '>95%' : streakProb <= 5 ? '<5%' : `${streakProb.toFixed(1)}%`}
            </span>
            <span className="text-[10px] text-stone-400">Target &gt; 70%</span>
          </div>

          <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${sStyle.bg} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, streakProb))}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Render Raw Data Breakdown when toggled
  const renderRawDataSection = () => {
    if (!showRawData) return null;

    return (
      <div className="mt-3 p-3 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 text-[11px] font-mono space-y-2">
        <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-between">
          <span>Grounded Tool Output Figures</span>
          <span className="text-[10px] text-stone-400 font-sans">Strict server-injected values</span>
        </div>
        <p className="text-[10px] text-stone-500 italic font-sans">
          Estimate from a model trained on public and synthetic data
        </p>

        {spec.series.map((s, idx) => (
          <div key={idx} className="space-y-1">
            <span className="font-bold text-teal-700 dark:text-teal-400">{s.name}:</span>
            {s.data ? (
              <div className="flex flex-wrap gap-1.5 pl-2 text-stone-600 dark:text-stone-300">
                {s.data.map((val, vIdx) => (
                  <span key={vIdx} className="px-1.5 py-0.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded">
                    {spec.labels[vIdx] || `P${vIdx}`}: {formatVal(val)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="pl-2 text-stone-600 dark:text-stone-300">
                Value: {s.value !== undefined ? formatVal(s.value) : 'N/A'} {s.unit || ''}
              </div>
            )}
          </div>
        ))}

        {spec.raw_data && (
          <details className="pt-1 text-[10px] text-stone-500">
            <summary className="cursor-pointer hover:underline">View Raw JSON</summary>
            <pre className="mt-1 p-2 rounded bg-stone-100 dark:bg-stone-950 overflow-x-auto text-[10px]">
              {JSON.stringify(spec.raw_data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="my-3 p-3.5 rounded-2xl bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] shadow-sm space-y-2">
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
            {spec.type === 'expense_donut' ? (
              <PieIcon className="w-3.5 h-3.5" />
            ) : spec.type === 'habit_burnout_gauge' ? (
              <Activity className="w-3.5 h-3.5" />
            ) : (
              <BarChart3 className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
              {spec.title || 'Data-Grounded Visualization'}
            </h4>
            <span className="text-[10px] text-stone-400">
              Derived strictly from tool computation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(spec.type === 'savings_forecast' || spec.type === 'simulation_fan') && (
            <span
              data-testid="forecast-datasource-badge"
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60"
            >
              Source: <strong className="ml-1 capitalize">{spec.raw_data?.data_source || 'personal'}</strong>
            </span>
          )}
          <button
            onClick={() => setShowRawData((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg inner-panel hover:bg-stone-100 dark:hover:bg-stone-800 text-[10px] font-medium text-stone-700 dark:text-stone-300 transition"
          >
            <Database className="w-3 h-3 text-stone-400" />
            <span>{showRawData ? 'Hide data' : 'Show data'}</span>
            {showRawData ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      {spec.type === 'simulation_fan' && renderSimulationFan()}
      {spec.type === 'savings_forecast' && renderSavingsForecast()}
      {spec.type === 'expense_donut' && renderExpenseDonut()}
      {spec.type === 'study_vs_sleep' && renderStudyVsSleep()}
      {spec.type === 'habit_burnout_gauge' && renderHabitBurnoutGauge()}

      {/* Collapsible Show Data Section */}
      {renderRawDataSection()}
    </div>
  );
};
