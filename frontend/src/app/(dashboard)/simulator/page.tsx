'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { SimulationRunResponse, SimulationScenarioParams } from '@/lib/types';
import ScenarioControls from '@/components/simulator/ScenarioControls';
import SimulationSummaryCards from '@/components/simulator/SimulationSummaryCards';
import SimulationComparisonCharts from '@/components/simulator/SimulationComparisonCharts';
import {
  Sparkles,
  AlertCircle,
  ShieldAlert,
  Info,
  Layers,
  HelpCircle,
} from 'lucide-react';

const DEFAULT_PARAMS: SimulationScenarioParams = {
  salary_change_pct: 10.0,
  one_time_expense: 0.0,
  one_time_expense_month: 1,
  study_hours_delta: 0.0,
  sleep_target_delta: 0.0,
  exercise_minutes_delta: 0.0,
  horizon_months: 6,
  iterations: 500,
};

const BASELINE_PARAMS: SimulationScenarioParams = {
  salary_change_pct: 0.0,
  one_time_expense: 0.0,
  one_time_expense_month: 1,
  study_hours_delta: 0.0,
  sleep_target_delta: 0.0,
  exercise_minutes_delta: 0.0,
  horizon_months: 6,
  iterations: 500,
};

export default function SimulatorPage() {
  const { user } = useAuth();
  const currency = user?.profile?.currency || 'USD';

  const [params, setParams] = useState<SimulationScenarioParams>(DEFAULT_PARAMS);
  const [simulation, setSimulation] = useState<SimulationRunResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulation = useCallback(async (scenarioParams: SimulationScenarioParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.runSimulation(scenarioParams);
      setSimulation(res);
    } catch (err: any) {
      console.error('Simulation error:', err);
      setError(err?.message || 'Failed to execute Monte Carlo simulation.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimulation(DEFAULT_PARAMS);
  }, [fetchSimulation]);

  const handleRun = () => {
    fetchSimulation(params);
  };

  const handleReset = () => {
    setParams(BASELINE_PARAMS);
    fetchSimulation(BASELINE_PARAMS);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Monte Carlo Stochastic Engine (500+ Runs)
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          What-If Life Decision Simulator
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Simulate the future ripple effects of major life decisions across personal finance, study performance,
          and burnout wellbeing using stochastic Monte Carlo modeling and coupled behavioral feedback loops.
        </p>
      </div>

      {/* Prominent Probabilistic Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300/90 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-amber-200 block">
            Probabilistic Estimation Notice
          </span>
          <p className="leading-relaxed text-slate-300">
            {simulation?.disclaimer ||
              'Monte Carlo simulations provide stochastic probabilistic projections based on historical distributions and cross-domain behavioral assumptions, not deterministic guarantees.'}
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Levers & Sliders */}
      <ScenarioControls
        params={params}
        onChange={setParams}
        onRun={handleRun}
        onReset={handleReset}
        isLoading={isLoading}
        currency={currency}
      />

      {/* Loading Skeleton */}
      {isLoading && !simulation && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
            ))}
          </div>
          <div className="h-96 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
        </div>
      )}

      {/* Simulation Results Section */}
      {simulation && (
        <div className="space-y-8">
          {/* Summary Stat Cards */}
          <SimulationSummaryCards simulation={simulation} currency={currency} />

          {/* High-Resolution Comparison Fan Charts */}
          <SimulationComparisonCharts simulation={simulation} currency={currency} />

          {/* Centralized Behavioral Assumptions Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>Centralized Cross-Domain Behavioral Assumptions</span>
              </div>
              <span className="text-[11px] text-slate-500">app/core/simulation_config.py</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              The simulation engine models human behavior not in silos, but as an interconnected ecosystem.
              The following empirically calibrated coefficients govern cross-domain ripple effects:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-400 font-semibold">Sleep → Study Retention</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 font-mono">
                    -8% / hr &lt; 6.5h
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Each hour of daily sleep below <strong>6.5 hours</strong> impairs memory consolidation and focus,
                  applying an <strong>8% score penalty</strong> per hour of deficit to projected exam performance.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-semibold">Exercise → Resilience Bonus</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono">
                    -15% Burnout Risk
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Regular physical activity of <strong>≥ 30 mins/day</strong> triggers stress reduction mechanisms,
                  reducing burnout vulnerability by <strong>15%</strong> and boosting cognitive retention by <strong>6%</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-semibold">Runway → Habit Anxiety</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 font-mono">
                    -12% Adherence
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Having less than <strong>2 months of emergency expense runway</strong> creates chronic baseline
                  anxiety, depressing daily habit follow-through by up to <strong>12%</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
