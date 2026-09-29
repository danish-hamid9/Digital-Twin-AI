'use client';

import React from 'react';
import Link from 'next/link';
import { Sliders, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function SimulatorPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Monte Carlo Engine (Phase 5 Feature)
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          What-If Life Decision Simulator
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Explore stochastic counterfactual scenarios across finance, study, and wellbeing.
        </p>
      </div>

      {/* Assumptions Transparency Card (Amendment 3) */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-sky-500/20 space-y-4">
        <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>Cross-Domain Modeling Assumptions & Heuristic Coefficients</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The simulation engine links life domains using the following centralized assumptions. All outputs are probabilistic estimates, not deterministic guarantees:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-indigo-400 font-semibold block mb-1">Sleep $\rightarrow$ Study Penalty</span>
            <p className="text-slate-400">
              Each hour of sleep below <strong>6.5h</strong> introduces an <strong>8%</strong> penalty to simulated study retention & score.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-emerald-400 font-semibold block mb-1">Exercise $\rightarrow$ Resilience</span>
            <p className="text-slate-400">
              Exercising <strong>&ge; 30 mins/day</strong> yields a <strong>15%</strong> reduction in burnout likelihood and a <strong>6%</strong> focus bonus.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-amber-400 font-semibold block mb-1">Financial Runway $\rightarrow$ Habits</span>
            <p className="text-slate-400">
              Having <strong>&lt; 2 months</strong> emergency savings introduces chronic financial anxiety, lowering habit adherence by <strong>12%</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
        <p className="text-sm text-slate-400">
          Interactive sliders for salary adjustments, one-time expenditures, and Monte Carlo fan charts (P10/P50/P90) will be unlocked in Phase 5.
        </p>
        <Link
          href="/overview"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition"
        >
          <span>Back to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
