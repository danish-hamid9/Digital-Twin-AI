'use client';

import React from 'react';
import Link from 'next/link';
import { CheckSquare, ArrowRight } from 'lucide-react';

export default function PlansPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
          <CheckSquare className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white">Action Plans & Tracker</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          Actionable life plans proposed by the Gemini assistant or created manually will be organized in a Kanban tracker in Phase 7 & Phase 8.
        </p>
        <Link
          href="/overview"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition"
        >
          <span>Return to Overview</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
