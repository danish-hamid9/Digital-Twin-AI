'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  GraduationCap,
  HeartPulse,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import { SimulationRunResponse, SimulationMonthPoint } from '@/lib/types';

interface SimulationComparisonChartsProps {
  simulation: SimulationRunResponse;
  currency?: string;
}

type DomainTab = 'savings' | 'study' | 'burnout' | 'habits';

export default function SimulationComparisonCharts({
  simulation,
  currency = 'USD',
}: SimulationComparisonChartsProps) {
  const [activeTab, setActiveTab] = useState<DomainTab>('savings');

  const { monthly_trajectory, scenario_params, summary } = simulation;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Prepare chart dataset
  const chartData = monthly_trajectory.map((pt: SimulationMonthPoint) => {
    // 1. Savings
    const bSavP10 = pt.baseline.cumulative_savings.p10;
    const bSavP50 = pt.baseline.cumulative_savings.p50;
    const bSavP90 = pt.baseline.cumulative_savings.p90;

    const sSavP10 = pt.scenario.cumulative_savings.p10;
    const sSavP50 = pt.scenario.cumulative_savings.p50;
    const sSavP90 = pt.scenario.cumulative_savings.p90;

    // 2. Study
    const bStudyP10 = pt.baseline.study_score.p10;
    const bStudyP50 = pt.baseline.study_score.p50;
    const bStudyP90 = pt.baseline.study_score.p90;

    const sStudyP10 = pt.scenario.study_score.p10;
    const sStudyP50 = pt.scenario.study_score.p50;
    const sStudyP90 = pt.scenario.study_score.p90;

    // 3. Burnout
    const bBoP10 = Math.round(pt.baseline.burnout_risk.p10 * 100);
    const bBoP50 = Math.round(pt.baseline.burnout_risk.p50 * 100);
    const bBoP90 = Math.round(pt.baseline.burnout_risk.p90 * 100);

    const sBoP10 = Math.round(pt.scenario.burnout_risk.p10 * 100);
    const sBoP50 = Math.round(pt.scenario.burnout_risk.p50 * 100);
    const sBoP90 = Math.round(pt.scenario.burnout_risk.p90 * 100);

    // 4. Habits
    const bHabP10 = Math.round(pt.baseline.habit_consistency.p10 * 100);
    const bHabP50 = Math.round(pt.baseline.habit_consistency.p50 * 100);
    const bHabP90 = Math.round(pt.baseline.habit_consistency.p90 * 100);

    const sHabP10 = Math.round(pt.scenario.habit_consistency.p10 * 100);
    const sHabP50 = Math.round(pt.scenario.habit_consistency.p50 * 100);
    const sHabP90 = Math.round(pt.scenario.habit_consistency.p90 * 100);

    return {
      month: pt.projected_date,
      month_index: pt.month_index,

      // Savings
      bSavP10,
      bSavBand: Math.max(0, bSavP90 - bSavP10),
      bSavP50,
      bSavP90,

      sSavP10,
      sSavBand: Math.max(0, sSavP90 - sSavP10),
      sSavP50,
      sSavP90,

      // Study
      bStudyP10,
      bStudyBand: Math.max(0, bStudyP90 - bStudyP10),
      bStudyP50,
      bStudyP90,

      sStudyP10,
      sStudyBand: Math.max(0, sStudyP90 - sStudyP10),
      sStudyP50,
      sStudyP90,

      // Burnout
      bBoP10,
      bBoBand: Math.max(0, bBoP90 - bBoP10),
      bBoP50,
      bBoP90,

      sBoP10,
      sBoBand: Math.max(0, sBoP90 - sBoP10),
      sBoP50,
      sBoP90,

      // Habits
      bHabP10,
      bHabBand: Math.max(0, bHabP90 - bHabP10),
      bHabP50,
      bHabP90,

      sHabP10,
      sHabBand: Math.max(0, sHabP90 - sHabP10),
      sHabP50,
      sHabP90,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    let bVal = 0;
    let sVal = 0;
    let bP10 = 0;
    let bP90 = 0;
    let sP10 = 0;
    let sP90 = 0;
    let unit = '';
    let formatFn = (n: number) => `${n}`;

    if (activeTab === 'savings') {
      bVal = d.bSavP50;
      sVal = d.sSavP50;
      bP10 = d.bSavP10;
      bP90 = d.bSavP90;
      sP10 = d.sSavP10;
      sP90 = d.sSavP90;
      formatFn = formatCurrency;
    } else if (activeTab === 'study') {
      bVal = d.bStudyP50;
      sVal = d.sStudyP50;
      bP10 = d.bStudyP10;
      bP90 = d.bStudyP90;
      sP10 = d.sStudyP10;
      sP90 = d.sStudyP90;
      unit = ' pts';
      formatFn = (n: number) => `${n.toFixed(1)}${unit}`;
    } else if (activeTab === 'burnout') {
      bVal = d.bBoP50;
      sVal = d.sBoP50;
      bP10 = d.bBoP10;
      bP90 = d.bBoP90;
      sP10 = d.sBoP10;
      sP90 = d.sBoP90;
      unit = '%';
      formatFn = (n: number) => `${n}${unit}`;
    } else {
      bVal = d.bHabP50;
      sVal = d.sHabP50;
      bP10 = d.bHabP10;
      bP90 = d.bHabP90;
      sP10 = d.sHabP10;
      sP90 = d.sHabP90;
      unit = '%';
      formatFn = (n: number) => `${n}${unit}`;
    }

    const delta = sVal - bVal;
    const sign = delta >= 0 ? '+' : '';

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md text-xs">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-4">
          <span>Month: {label}</span>
          <span className="text-slate-400 font-normal">Iteration Ensembles</span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-slate-400">Baseline (Expected P50):</div>
            <div className="font-semibold text-slate-300 font-mono">
              {formatFn(bVal)} <span className="text-[10px] text-slate-500 font-normal">({formatFn(bP10)} - {formatFn(bP90)})</span>
            </div>
          </div>

          <div>
            <div className="text-slate-400">Scenario (What-If P50):</div>
            <div className="font-semibold text-emerald-400 font-mono">
              {formatFn(sVal)} <span className="text-[10px] text-slate-500 font-normal">({formatFn(sP10)} - {formatFn(sP90)})</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Projected Delta:</span>
            <span className={`font-mono font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {sign}{formatFn(delta)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-6">
      {/* Header & Domain Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Stochastic Counterfactual Comparison
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dashed lines represent current baseline; shaded ribbons show <strong>P10 (Risk) to P90 (Best Case)</strong> confidence spreads across {simulation.iterations} Monte Carlo runs.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('savings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'savings'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Savings</span>
          </button>

          <button
            onClick={() => setActiveTab('study')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'study'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Study Score</span>
          </button>

          <button
            onClick={() => setActiveTab('burnout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'burnout'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Burnout Risk</span>
          </button>

          <button
            onClick={() => setActiveTab('habits')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'habits'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Habits</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
            <defs>
              {/* Savings Shading */}
              <linearGradient id="baselineSavBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="scenarioSavBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
              </linearGradient>

              {/* Study Shading */}
              <linearGradient id="baselineStudyBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="scenarioStudyBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.08} />
              </linearGradient>

              {/* Burnout Shading */}
              <linearGradient id="baselineBoBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="scenarioBoBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.08} />
              </linearGradient>

              {/* Habits Shading */}
              <linearGradient id="baselineHabBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="scenarioHabBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.08} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => {
                if (activeTab === 'savings') {
                  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}k`;
                  return `$${val}`;
                }
                if (activeTab === 'study') return `${val}pts`;
                return `${val}%`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }}
            />

            {/* TAB 1: SAVINGS */}
            {activeTab === 'savings' && (
              <>
                <Area
                  name="Baseline Band (P10-P90)"
                  dataKey="bSavBand"
                  baseValue="dataMin"
                  stackId="baseBand"
                  fill="url(#baselineSavBandGrad)"
                  stroke="none"
                />
                <Area
                  name="Scenario Band (P10-P90)"
                  dataKey="sSavBand"
                  baseValue="dataMin"
                  stackId="scenBand"
                  fill="url(#scenarioSavBandGrad)"
                  stroke="none"
                />
                <Line
                  name="Baseline P50"
                  type="monotone"
                  dataKey="bSavP50"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#94a3b8' }}
                />
                <Line
                  name="Scenario P50"
                  type="monotone"
                  dataKey="sSavP50"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                />
              </>
            )}

            {/* TAB 2: STUDY */}
            {activeTab === 'study' && (
              <>
                <Area
                  name="Baseline Band (P10-P90)"
                  dataKey="bStudyBand"
                  baseValue="dataMin"
                  stackId="baseBand"
                  fill="url(#baselineStudyBandGrad)"
                  stroke="none"
                />
                <Area
                  name="Scenario Band (P10-P90)"
                  dataKey="sStudyBand"
                  baseValue="dataMin"
                  stackId="scenBand"
                  fill="url(#scenarioStudyBandGrad)"
                  stroke="none"
                />
                <Line
                  name="Baseline P50"
                  type="monotone"
                  dataKey="bStudyP50"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#94a3b8' }}
                />
                <Line
                  name="Scenario P50"
                  type="monotone"
                  dataKey="sStudyP50"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366f1' }}
                />
              </>
            )}

            {/* TAB 3: BURNOUT */}
            {activeTab === 'burnout' && (
              <>
                <Area
                  name="Baseline Band (P10-P90)"
                  dataKey="bBoBand"
                  baseValue="dataMin"
                  stackId="baseBand"
                  fill="url(#baselineBoBandGrad)"
                  stroke="none"
                />
                <Area
                  name="Scenario Band (P10-P90)"
                  dataKey="sBoBand"
                  baseValue="dataMin"
                  stackId="scenBand"
                  fill="url(#scenarioBoBandGrad)"
                  stroke="none"
                />
                <Line
                  name="Baseline P50"
                  type="monotone"
                  dataKey="bBoP50"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#94a3b8' }}
                />
                <Line
                  name="Scenario P50"
                  type="monotone"
                  dataKey="sBoP50"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f43f5e' }}
                />
              </>
            )}

            {/* TAB 4: HABITS */}
            {activeTab === 'habits' && (
              <>
                <Area
                  name="Baseline Band (P10-P90)"
                  dataKey="bHabBand"
                  baseValue="dataMin"
                  stackId="baseBand"
                  fill="url(#baselineHabBandGrad)"
                  stroke="none"
                />
                <Area
                  name="Scenario Band (P10-P90)"
                  dataKey="sHabBand"
                  baseValue="dataMin"
                  stackId="scenBand"
                  fill="url(#scenarioHabBandGrad)"
                  stroke="none"
                />
                <Line
                  name="Baseline P50"
                  type="monotone"
                  dataKey="bHabP50"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#94a3b8' }}
                />
                <Line
                  name="Scenario P50"
                  type="monotone"
                  dataKey="sHabP50"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
