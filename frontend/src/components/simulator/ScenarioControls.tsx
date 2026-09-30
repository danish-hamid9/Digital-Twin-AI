'use client';

import React from 'react';
import {
  Sliders,
  DollarSign,
  GraduationCap,
  Moon,
  Dumbbell,
  Clock,
  Sparkles,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { SimulationScenarioParams } from '@/lib/types';

interface ScenarioControlsProps {
  params: SimulationScenarioParams;
  onChange: (updated: SimulationScenarioParams) => void;
  onRun: () => void;
  onReset: () => void;
  isLoading: boolean;
  currency?: string;
}

export default function ScenarioControls({
  params,
  onChange,
  onRun,
  onReset,
  isLoading,
  currency = 'USD',
}: ScenarioControlsProps) {
  const updateParam = <K extends keyof SimulationScenarioParams>(
    key: K,
    val: SimulationScenarioParams[K]
  ) => {
    onChange({
      ...params,
      [key]: val,
    });
  };

  const isSleepPenaltyActive = params.sleep_target_delta < -0.5;
  const isExerciseBonusActive = params.exercise_minutes_delta >= 10;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Scenario Parameters & What-If Levers
          </h3>
        </div>

        <button
          onClick={onReset}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 transition disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Baseline</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
        {/* 1. Salary Adjustment Slider */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <DollarSign className="w-4 h-4" />
              Salary / Income Change
            </span>
            <span className="font-mono font-bold text-sm text-emerald-300">
              {params.salary_change_pct > 0 ? `+${params.salary_change_pct}%` : `${params.salary_change_pct}%`}
            </span>
          </div>

          <input
            type="range"
            min="-30"
            max="60"
            step="1"
            value={params.salary_change_pct}
            onChange={(e) => updateParam('salary_change_pct', parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center gap-1.5 pt-1">
            {[-10, 0, 10, 20].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => updateParam('salary_change_pct', pct)}
                className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
                  params.salary_change_pct === pct
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-800'
                }`}
              >
                {pct > 0 ? `+${pct}%` : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* 2. One-Time Expense */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-rose-400">
              <DollarSign className="w-4 h-4" />
              One-Time Purchase / Shock
            </span>
            <span className="font-mono font-bold text-sm text-rose-300">
              ${params.one_time_expense.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Amount ($)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={params.one_time_expense}
                onChange={(e) => updateParam('one_time_expense', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-rose-500"
                placeholder="e.g. 1500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Occurs in Month</label>
              <select
                value={params.one_time_expense_month}
                onChange={(e) => updateParam('one_time_expense_month', parseInt(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
              >
                {Array.from({ length: params.horizon_months }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Month {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {[0, 800, 1500, 3000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => updateParam('one_time_expense', amt)}
                className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
                  params.one_time_expense === amt
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-800'
                }`}
              >
                {amt === 0 ? '$0' : `$${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Study Hours Delta */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-indigo-400">
              <GraduationCap className="w-4 h-4" />
              Study Hours Allocation
            </span>
            <span className="font-mono font-bold text-sm text-indigo-300">
              {params.study_hours_delta > 0 ? `+${params.study_hours_delta}h` : `${params.study_hours_delta}h`} / wk
            </span>
          </div>

          <input
            type="range"
            min="-10"
            max="15"
            step="1"
            value={params.study_hours_delta}
            onChange={(e) => updateParam('study_hours_delta', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center gap-1.5 pt-1">
            {[-4, 0, 4, 8].map((hrs) => (
              <button
                key={hrs}
                type="button"
                onClick={() => updateParam('study_hours_delta', hrs)}
                className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
                  params.study_hours_delta === hrs
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-800'
                }`}
              >
                {hrs > 0 ? `+${hrs}h` : `${hrs}h`}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Sleep Target Delta (Coupled to Study Penalty) */}
        <div className={`space-y-3 p-4 rounded-xl border transition ${
          isSleepPenaltyActive
            ? 'bg-amber-950/30 border-amber-500/40'
            : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-sky-400">
              <Moon className="w-4 h-4" />
              Sleep Target Delta
            </span>
            <span className="font-mono font-bold text-sm text-sky-300">
              {params.sleep_target_delta > 0 ? `+${params.sleep_target_delta}h` : `${params.sleep_target_delta}h`} / day
            </span>
          </div>

          <input
            type="range"
            min="-2.5"
            max="2.0"
            step="0.5"
            value={params.sleep_target_delta}
            onChange={(e) => updateParam('sleep_target_delta', parseFloat(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          {isSleepPenaltyActive && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Cross-domain retention penalty active (&lt; 6.5h threshold)</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            {[-1.5, -1.0, 0, 1.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateParam('sleep_target_delta', s)}
                className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
                  params.sleep_target_delta === s
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-800'
                }`}
              >
                {s > 0 ? `+${s}h` : `${s}h`}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Exercise Minutes Delta (Coupled to Burnout Resilience) */}
        <div className={`space-y-3 p-4 rounded-xl border transition ${
          isExerciseBonusActive
            ? 'bg-emerald-950/30 border-emerald-500/40'
            : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-amber-400">
              <Dumbbell className="w-4 h-4" />
              Exercise Routine Delta
            </span>
            <span className="font-mono font-bold text-sm text-amber-300">
              {params.exercise_minutes_delta > 0 ? `+${params.exercise_minutes_delta}m` : `${params.exercise_minutes_delta}m`} / day
            </span>
          </div>

          <input
            type="range"
            min="-20"
            max="45"
            step="5"
            value={params.exercise_minutes_delta}
            onChange={(e) => updateParam('exercise_minutes_delta', parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          {isExerciseBonusActive && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Resilience bonus active (15% burnout risk reduction)</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            {[-15, 0, 15, 30].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => updateParam('exercise_minutes_delta', ex)}
                className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
                  params.exercise_minutes_delta === ex
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-800'
                }`}
              >
                {ex > 0 ? `+${ex}m` : `${ex}m`}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Horizon & Stochastic Depth Settings */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <span className="flex items-center gap-1.5 font-semibold text-slate-300 mb-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Simulation Scope & Horizon
            </span>

            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[3, 6, 9, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateParam('horizon_months', m)}
                  className={`py-1.5 rounded text-xs font-semibold transition ${
                    params.horizon_months === m
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Monte Carlo Iterations:</span>
              <span className="font-mono text-slate-300 font-semibold">{params.iterations} runs</span>
            </div>
          </div>

          <button
            onClick={onRun}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Simulating 500+ Iterations...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Simulate What-If Trajectory</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
