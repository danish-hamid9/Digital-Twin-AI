'use client';

import React, { useState } from 'react';
import { GraduationCap, Sparkles, ShieldCheck, AlertCircle, ArrowUpRight, Lightbulb } from 'lucide-react';
import { StudyPredictionResponse } from '@/lib/types';

interface StudyScorePredictionCardProps {
  prediction: StudyPredictionResponse;
}

export default function StudyScorePredictionCard({ prediction }: StudyScorePredictionCardProps) {
  const {
    current_predicted_score,
    feature_importance,
    study_hours_scenarios,
    data_source,
    personal_weight,
    top_improvement_lever,
    explanation,
    model_metadata,
  } = prediction;

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number | null>(null);

  const activeScore =
    selectedScenarioIndex !== null
      ? study_hours_scenarios[selectedScenarioIndex]?.projected_score
      : current_predicted_score;

  const activeHours =
    selectedScenarioIndex !== null
      ? study_hours_scenarios[selectedScenarioIndex]?.weekly_study_hours
      : null;

  const getSourceBadge = () => {
    if (data_source === 'personal') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/70 text-indigo-400 border border-indigo-800/60">
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

  const featureLabels: Record<string, string> = {
    rolling_study_hours: 'Study Volume (Hours)',
    study_consistency: 'Daily Consistency',
    rolling_sleep_hours: 'Sleep Duration & Rest',
    rolling_exercise_minutes: 'Physical Activity',
    rolling_mood: 'Mood & Wellbeing',
  };

  return (
    <div className="bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] rounded-2xl p-5 transition shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              ML Exam Score Forecast & Key Drivers
            </h3>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            RandomForest Regression predicting assessment outcomes with ensemble confidence bounds
          </p>
        </div>

        {getSourceBadge()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
        {/* Main Score Gauge Box */}
        <div className="md:col-span-5 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
              <span>{activeHours ? `Scenario (${activeHours}h/wk)` : 'Current Trajectory'}</span>
              <span className="text-[11px] text-stone-400">80% Confidence</span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {activeScore?.expected.toFixed(1)}%
              </span>
              <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                Range: [{activeScore?.lower.toFixed(1)}% – {activeScore?.upper.toFixed(1)}%]
              </span>
            </div>

            {/* Score progress bar */}
            <div className="w-full bg-[#E6DFD3] dark:bg-[#2D2721] rounded-full h-2.5 overflow-hidden my-2">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, activeScore?.expected || 0))}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E6DFD3] dark:border-[#2D2721] mt-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold">Top Lever:</span>
              <span className="text-stone-700 dark:text-stone-300">{top_improvement_lever}</span>
            </div>
          </div>
        </div>

        {/* Feature Importance Bars */}
        <div className="md:col-span-7 bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-2 flex items-center justify-between">
            <span>Model Feature Importance</span>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider">Impact Weight</span>
          </div>

          <div className="space-y-2">
            {Object.entries(feature_importance)
              .sort((a, b) => b[1] - a[1])
              .map(([key, weight]) => {
                const label = featureLabels[key] || key;
                const pct = Math.round(weight * 100);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] text-stone-600 dark:text-stone-400 mb-0.5">
                      <span>{label}</span>
                      <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full bg-[#E6DFD3] dark:bg-[#2D2721] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* What-If Study Scenarios */}
      <div className="bg-[#FAF7F0] dark:bg-[#181614] border border-[#E6DFD3] dark:border-[#2D2721] rounded-xl p-3 mb-3">
        <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-2 flex items-center gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Interactive What-If Scenario Analysis (Weekly Study Hours):</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {study_hours_scenarios.map((sc, idx) => {
            const isSelected = selectedScenarioIndex === idx;
            return (
              <button
                key={sc.weekly_study_hours}
                onClick={() => setSelectedScenarioIndex(isSelected ? null : idx)}
                className={`p-2 rounded-lg border text-left transition ${
                  isSelected
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium shadow-sm'
                    : 'bg-white dark:bg-[#1C1A17] border-[#E6DFD3] dark:border-[#2D2721] text-stone-700 dark:text-stone-300 hover:border-stone-400'
                }`}
              >
                <div className="text-[11px] text-stone-500 dark:text-stone-400">{sc.weekly_study_hours} hrs/week</div>
                <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {sc.projected_score.expected.toFixed(1)}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disclaimer on Synthetic vs Real Patterns */}
      <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-amber-300">
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
            Model R²: {model_metadata.metrics.r2} | MAE: {model_metadata.metrics.mae} pts
          </div>
        )}
      </div>
    </div>
  );
}
