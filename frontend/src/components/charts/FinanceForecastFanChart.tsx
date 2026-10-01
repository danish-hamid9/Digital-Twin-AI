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
import { TrendingUp, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { FinancePredictionResponse } from '@/lib/types';

interface FinanceForecastFanChartProps {
  prediction: FinancePredictionResponse;
  currency?: string;
  onHorizonChange?: (months: number) => void;
}

export default function FinanceForecastFanChart({
  prediction,
  currency = 'USD',
  onHorizonChange,
}: FinanceForecastFanChartProps) {
  const [metricView, setMetricView] = useState<'expenses' | 'savings'>('savings');

  const { forecasts, data_source, personal_weight, model_metadata, explanation, horizon_months } = prediction;

  // Prepare chart data with baseline and band width for shaded fan chart
  const chartData = forecasts.map((f) => {
    const expLower = Math.max(0, f.projected_expenses.lower);
    const expUpper = f.projected_expenses.upper;
    const expExpected = f.projected_expenses.expected;

    const savLower = f.cumulative_savings.lower;
    const savUpper = f.cumulative_savings.upper;
    const savExpected = f.cumulative_savings.expected;

    return {
      month: f.projected_date,
      // For expenses
      expLower,
      expBand: Math.max(0, expUpper - expLower),
      expUpper,
      expExpected,
      // For cumulative savings
      savLower,
      savBand: Math.max(0, savUpper - savLower),
      savUpper,
      savExpected,
    };
  });

  const getSourceBadge = () => {
    if (data_source === 'personal') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          Personal Model (100% History)
        </span>
      );
    }
    if (data_source === 'blended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
          <Sparkles className="w-3.5 h-3.5" />
          Blended Model ({Math.round(personal_weight * 100)}% Personal / {Math.round((1 - personal_weight) * 100)}% Benchmark)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        Global Benchmark (Cold Start)
      </span>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const isSavings = metricView === 'savings';
    const expected = isSavings ? data.savExpected : data.expExpected;
    const lower = isSavings ? data.savLower : data.expLower;
    const upper = isSavings ? data.savUpper : data.expUpper;
    const title = isSavings ? 'Cumulative Savings Forecast' : 'Monthly Expense Forecast';

    return (
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80 rounded-xl p-3 shadow-xl text-xs">
        <div className="font-semibold text-stone-800 dark:text-stone-200 border-b border-stone-100 dark:border-stone-800 pb-1.5 mb-2">
          Target Month: <span className="text-stone-950 dark:text-white font-mono">{label}</span>
        </div>
        <div className="text-stone-500 dark:text-stone-400 mb-1">{title}:</div>
        <div className={`text-base font-bold font-mono mb-2 ${isSavings ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
          {currency} {expected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center justify-between gap-4 text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800/80">
          <span>80% Confidence Band:</span>
          <span className="font-mono text-stone-800 dark:text-stone-200 font-semibold">
            {currency} {lower.toLocaleString('en-US', { minimumFractionDigits: 0 })} to {currency} {upper.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              ML Financial Forecast & Fan Chart
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Ridge Regression projection with expanding horizon uncertainty intervals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {getSourceBadge()}

          {/* Metric Selector */}
          <div className="flex bg-stone-100 dark:bg-stone-800/90 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700/80 text-xs">
            <button
              onClick={() => setMetricView('savings')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                metricView === 'savings'
                  ? 'bg-teal-600 text-white shadow-sm font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Cumulative Savings
            </button>
            <button
              onClick={() => setMetricView('expenses')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                metricView === 'expenses'
                  ? 'bg-orange-600 text-white shadow-sm font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Monthly Expenses
            </button>
          </div>

          {/* Horizon Selector */}
          {onHorizonChange && (
            <div className="flex bg-stone-100 dark:bg-stone-800/90 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700/80 text-xs">
              {[3, 6].map((m) => (
                <button
                  key={m}
                  onClick={() => onHorizonChange(m)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    horizon_months === m
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              {/* Savings Gradient: Refined Mineral Teal */}
              <linearGradient id="savingsBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0.03} />
              </linearGradient>
              {/* Expenses Gradient: Warm Burnt Terracotta */}
              <linearGradient id="expensesBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EA580C" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#EA580C" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#D6CEC1" opacity={0.35} />
            <XAxis dataKey="month" stroke="#78716C" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#78716C"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => `${currency} ${(val / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {metricView === 'savings' ? (
              <>
                {/* Lower boundary (transparent spacer) */}
                <Area
                  type="monotone"
                  dataKey="savLower"
                  stackId="sav"
                  stroke="transparent"
                  fill="transparent"
                  legendType="none"
                />
                {/* Confidence band width */}
                <Area
                  name="Confidence Band (80%)"
                  type="monotone"
                  dataKey="savBand"
                  stackId="sav"
                  stroke="#0D9488"
                  strokeDasharray="3 3"
                  fill="url(#savingsBand)"
                />
                {/* Expected trajectory */}
                <Line
                  name="Expected Cumulative Savings"
                  type="monotone"
                  dataKey="savExpected"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0D9488', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                />
              </>
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="expLower"
                  stackId="exp"
                  stroke="transparent"
                  fill="transparent"
                  legendType="none"
                />
                <Area
                  name="Confidence Band (80%)"
                  type="monotone"
                  dataKey="expBand"
                  stackId="exp"
                  stroke="#EA580C"
                  strokeDasharray="3 3"
                  fill="url(#expensesBand)"
                />
                <Line
                  name="Expected Monthly Expense"
                  type="monotone"
                  dataKey="expExpected"
                  stroke="#EA580C"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#EA580C', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer on Synthetic vs Real Patterns */}
      <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-amber-300">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p>
          <span className="font-semibold text-amber-900 dark:text-amber-200">Model Validity Notice: </span>
          High accuracy reflects learned patterns from synthetic data generation rules, not validated real-world prediction.
        </p>
      </div>

      {/* Explanatory Callout Footer */}
      <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-stone-500 dark:text-stone-400 gap-2">
        <p className="italic">{explanation}</p>
        {model_metadata?.metrics && (
          <div className="text-[11px] text-stone-400 dark:text-stone-500 font-mono shrink-0">
            Model R²: {model_metadata.metrics.r2} | MAE: ${model_metadata.metrics.mae}
          </div>
        )}
      </div>
    </div>
  );
}
