'use client';

import React from 'react';
import {
  DollarSign,
  GraduationCap,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { SimulationRunResponse } from '@/lib/types';

interface SimulationSummaryCardsProps {
  simulation: SimulationRunResponse;
  currency?: string;
}

export default function SimulationSummaryCards({
  simulation,
  currency = 'USD',
}: SimulationSummaryCardsProps) {
  const { summary, horizon_months, scenario_params } = simulation;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const savDelta = summary.savings_net_impact_p50;
  const studyDelta = summary.study_score_net_impact_p50;
  const burnoutDelta = summary.burnout_risk_net_impact_p50;

  return (
    <div className="space-y-6">
      {/* 3 Domain Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Cumulative Savings Impact */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              {horizon_months}-Month Net Savings
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
                savDelta >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {savDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {savDelta >= 0 ? `+${formatCurrency(savDelta)}` : formatCurrency(savDelta)}
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(summary.scenario_final_savings.p50)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Baseline: <strong className="text-slate-300 font-mono">{formatCurrency(summary.baseline_final_savings.p50)}</strong></span>
              <span className="text-slate-500">P10: {formatCurrency(summary.scenario_final_savings.p10)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            Median expected liquid reserve at month {horizon_months}.
          </div>
        </div>

        {/* 2. Study Performance Impact */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              Final Exam / Course Score
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
                studyDelta >= 0
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {studyDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {studyDelta >= 0 ? `+${studyDelta.toFixed(1)} pts` : `${studyDelta.toFixed(1)} pts`}
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-indigo-400">
              {summary.scenario_final_study_score.p50.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Baseline: <strong className="text-slate-300 font-mono">{summary.baseline_final_study_score.p50.toFixed(1)}%</strong></span>
              <span className="text-slate-500">P10: {summary.scenario_final_study_score.p10.toFixed(1)}%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            Coupled to sleep debt and weekly study consistency.
          </div>
        </div>

        {/* 3. Burnout Vulnerability Impact */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              Burnout Vulnerability
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
                burnoutDelta <= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {burnoutDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {burnoutDelta <= 0 ? `${(burnoutDelta * 100).toFixed(1)}%` : `+${(burnoutDelta * 100).toFixed(1)}%`}
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {Math.round(summary.scenario_final_burnout_risk.p50 * 100)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Baseline: <strong className="text-slate-300 font-mono">{Math.round(summary.baseline_final_burnout_risk.p50 * 100)}%</strong></span>
              <span className="text-slate-500">P90 (Stress): {Math.round(summary.scenario_final_burnout_risk.p90 * 100)}%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            Regulated by daily exercise and recovery heuristics.
          </div>
        </div>
      </div>

      {/* Cross-Domain Synthesized Insights */}
      {summary.cross_domain_insights.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-sky-500/20 space-y-2">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cross-Domain Ripple Effects & Key Insights</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {summary.cross_domain_insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
