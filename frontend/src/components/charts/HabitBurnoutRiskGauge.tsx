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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-950/80 text-rose-400 border border-rose-800/80">
          <AlertTriangle className="w-3.5 h-3.5" />
          High Risk
        </span>
      );
    }
    if (burnout_risk_level === 'moderate') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-800/80">
          <AlertCircle className="w-3.5 h-3.5" />
          Moderate Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Low Risk
      </span>
    );
  };

  const getFactorIcon = (factorName: string) => {
    const lower = factorName.toLowerCase();
    if (lower.includes('sleep')) return <Bed className="w-4 h-4 text-indigo-400" />;
    if (lower.includes('exercise')) return <Dumbbell className="w-4 h-4 text-emerald-400" />;
    if (lower.includes('mood')) return <Smile className="w-4 h-4 text-amber-400" />;
    if (lower.includes('workload')) return <Briefcase className="w-4 h-4 text-purple-400" />;
    return <Activity className="w-4 h-4 text-cyan-400" />;
  };

  const getStatusColor = (status: HabitRiskFactor['status']) => {
    if (status === 'critical') return 'text-rose-400 bg-rose-950/50 border-rose-800/60';
    if (status === 'warning') return 'text-amber-400 bg-amber-950/50 border-amber-800/60';
    return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Habit Streak & Burnout Risk Forecast
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calibrated Logistic Regression (Platt scaling) predicting streak durability and exhaustion threshold
          </p>
        </div>

        {getSourceBadge()}
      </div>

      {/* Dual Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Streak Continuation Card */}
        <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-200">Streak Continuation Probability</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Horizon: 7 Days</span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-3xl font-extrabold text-amber-400 font-mono">
                {streakPct}%
              </span>
              <span className="text-xs text-slate-400">
                {streakPct >= 75 ? 'Strong Momentum' : streakPct >= 50 ? 'Moderate Consistency' : 'High Dropout Risk'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${streakPct}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Calibrated odds that habit routines continue uninterrupted over the upcoming week.
          </p>
        </div>

        {/* Burnout Risk Card */}
        <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-slate-200">Burnout Vulnerability Meter</span>
            </div>
            {getRiskLevelBadge()}
          </div>

          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className={`text-3xl font-extrabold font-mono ${
                burnout_risk_level === 'high' ? 'text-rose-400' :
                burnout_risk_level === 'moderate' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {burnoutPct}%
              </span>
              <span className="text-xs text-slate-400">
                {burnoutPct > 65 ? 'Elevated Fatigue Threat' : burnoutPct > 35 ? 'Moderate Strain' : 'Well Recovered'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  burnout_risk_level === 'high'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : burnout_risk_level === 'moderate'
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                }`}
                style={{ width: `${burnoutPct}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Multi-factor exhaustion metric derived from rolling sleep debt, exercise gaps, and mood trajectory.
          </p>
        </div>
      </div>

      {/* 4-Factor Breakdown */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
          Health & Recovery Risk Factor Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {risk_factors.map((factor, idx) => (
            <div
              key={idx}
              className="bg-slate-950/40 border border-slate-800/70 rounded-xl p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {getFactorIcon(factor.factor)}
                  <span className="text-xs font-semibold text-slate-200">{factor.factor}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(factor.status)}`}>
                  {factor.status}
                </span>
              </div>
              <div className="text-base font-bold font-mono text-white mb-1">
                {factor.value}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {factor.impact}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Risk Mitigation Recommendations</span>
          </div>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer on Synthetic vs Real Patterns */}
      <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-start gap-2.5 text-[11px] text-amber-300/90">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
        <p>
          <span className="font-semibold text-amber-200">Model Validity Notice: </span>
          High accuracy reflects learned patterns from synthetic data generation rules, not validated real-world prediction.
        </p>
      </div>

      {/* Explanatory Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2">
        <p className="italic">{explanation}</p>
        {model_metadata?.metrics && (
          <div className="text-[11px] text-slate-500 font-mono shrink-0">
            Streak Acc: {(model_metadata.metrics.streak_accuracy * 100).toFixed(1)}% (Brier: {model_metadata.metrics.streak_brier_loss || model_metadata.metrics.streak_brier_score}) | Burnout Acc: {(model_metadata.metrics.burnout_accuracy * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
