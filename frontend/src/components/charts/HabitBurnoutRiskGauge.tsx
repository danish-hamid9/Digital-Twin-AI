'use client';

import React from 'react';
import {
  Flame,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Activity,
  Bed,
  Dumbbell,
  Smile,
  Briefcase,
} from 'lucide-react';
import { HabitPredictionResponse, HabitRiskFactor } from '@/lib/types';

interface HabitBurnoutRiskGaugeProps {
  prediction: HabitPredictionResponse;
}

export default function HabitBurnoutRiskGauge({ prediction }: HabitBurnoutRiskGaugeProps) {
  const {
    streak_continuation_probability,
    burnout_risk_score,
    burnout_risk_level,
    risk_factors,
    recommendations,
    data_source,
    personal_weight,
    explanation,
    model_metadata,
  } = prediction;

  const streakPct = Math.round(streak_continuation_probability * 100);
  const burnoutPct = Math.round(burnout_risk_score * 100);

  const getSourceBadge = () => {
    if (data_source === 'personal') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          Personal Model (100% History)
        </span>
      );
    }
    if (data_source === 'blended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/70 text-indigo-400 border border-indigo-800/60">
          <Sparkles className="w-3.5 h-3.5" />
          Blended ({Math.round(personal_weight * 100)}% Personal / {Math.round((1 - personal_weight) * 100)}% Benchmark)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        Global Benchmark (Cold Start)
      </span>
    );
  };

  const getRiskLevelBadge = () => {
    if (burnout_risk_level === 'high') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
          <AlertTriangle className="w-3.5 h-3.5" />
          High Risk
        </span>
      );
    }
    if (burnout_risk_level === 'moderate') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          Moderate Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Low Risk
      </span>
    );
  };

  const getFactorIcon = (factorName: string) => {
    const lower = factorName.toLowerCase();
    if (lower.includes('sleep')) return <Bed className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    if (lower.includes('exercise')) return <Dumbbell className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    if (lower.includes('mood')) return <Smile className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    if (lower.includes('workload')) return <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    return <Activity className="w-4 h-4 text-stone-600 dark:text-stone-400" />;
  };

  const getStatusColor = (status: HabitRiskFactor['status']) => {
    if (status === 'critical') return 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20';
    if (status === 'warning') return 'text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/20';
    return 'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/20';
  };

  return (
    <div className="bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] rounded-2xl p-5 transition shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Habit Streak & Burnout Risk Forecast
            </h3>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Calibrated Logistic Regression (Platt scaling) predicting streak durability and exhaustion threshold
          </p>
        </div>

        {getSourceBadge()}
      </div>

      {/* Dual Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Streak Continuation Card */}
        <div className="bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-semibold text-stone-900 dark:text-stone-100">Streak Continuation Probability</span>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">Horizon: 7 Days</span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {streakPct}%
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {streakPct >= 75 ? 'Strong Momentum' : streakPct >= 50 ? 'Moderate Consistency' : 'High Dropout Risk'}
              </span>
            </div>
            <div className="w-full bg-[#E6DFD3] dark:bg-[#2D2721] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${streakPct}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2">
            Calibrated odds that habit routines continue uninterrupted over the upcoming week.
          </p>
        </div>

        {/* Burnout Risk Card */}
        <div className="bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="font-semibold text-stone-900 dark:text-stone-100">Burnout Vulnerability Meter</span>
            </div>
            {getRiskLevelBadge()}
          </div>

          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className={`text-3xl font-extrabold font-mono ${
                burnout_risk_level === 'high' ? 'text-rose-600 dark:text-rose-400' :
                burnout_risk_level === 'moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'
              }`}>
                {burnoutPct}%
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {burnoutPct > 65 ? 'Elevated Fatigue Threat' : burnoutPct > 35 ? 'Moderate Strain' : 'Well Recovered'}
              </span>
            </div>
            <div className="w-full bg-[#E6DFD3] dark:bg-[#2D2721] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  burnout_risk_level === 'high'
                    ? 'bg-rose-500'
                    : burnout_risk_level === 'moderate'
                    ? 'bg-amber-500'
                    : 'bg-teal-500'
                }`}
                style={{ width: `${burnoutPct}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2">
            Multi-factor exhaustion metric derived from rolling sleep debt, exercise gaps, and mood trajectory.
          </p>
        </div>
      </div>

      {/* 4-Factor Breakdown */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2.5">
          Health & Recovery Risk Factor Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {risk_factors.map((factor, idx) => (
            <div
              key={idx}
              className="bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {getFactorIcon(factor.factor)}
                  <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">{factor.factor}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(factor.status)}`}>
                  {factor.status}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 mb-1">
                {factor.value}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                {factor.impact}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>AI Risk Mitigation Recommendations</span>
          </div>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer on Synthetic vs Real Patterns */}
      <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-amber-300">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p>
          <span className="font-semibold text-amber-900 dark:text-amber-200">Model Validity Notice: </span>
          High accuracy reflects learned patterns from synthetic data generation rules, not validated real-world prediction.
        </p>
      </div>

      {/* Explanatory Footer */}
      <div className="pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-stone-500 dark:text-stone-400 gap-2">
        <p className="italic">{explanation}</p>
        {model_metadata?.metrics && (
          <div className="text-[11px] text-stone-400 font-mono shrink-0">
            Streak Acc: {(model_metadata.metrics.streak_accuracy * 100).toFixed(1)}% (Brier: {model_metadata.metrics.streak_brier_loss || model_metadata.metrics.streak_brier_score}) | Burnout Acc: {(model_metadata.metrics.burnout_accuracy * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
