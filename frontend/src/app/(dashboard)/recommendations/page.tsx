'use client';

import React from 'react';
import Link from 'next/link';
import RecommendationsSection from '@/components/recommendations/RecommendationsSection';
import { Lightbulb, ArrowLeft, Sliders, MessageSquare } from 'lucide-react';

export default function RecommendationsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/20 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Automated Life Heuristics & Recommendations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Actionable Recommendations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Personalized, rule-based recommendations cross-referencing your financial runway, academic performance, and recovery metrics with active simulation benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/overview"
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard Overview</span>
          </Link>
          <Link
            href="/simulator"
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-sky-400 hover:text-sky-300 hover:border-sky-500/40 transition flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>What-If Simulator</span>
          </Link>
        </div>
      </div>

      {/* Main Recommendations Container */}
      <RecommendationsSection />
    </div>
  );
}
