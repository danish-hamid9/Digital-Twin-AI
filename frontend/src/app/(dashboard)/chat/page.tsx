'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Sparkles, Shield, ArrowRight } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Google Gemini with Tool Calling
        </div>
        <h1 className="text-2xl font-bold text-white">AI Decision Assistant</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
          The conversational interface will interact directly with your digital twin using server-injected tool calls, strictly grounded figures, and plan proposal confirmations in Phase 7.
        </p>

        <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 max-w-md flex items-center gap-2 text-left">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Cap of 5 tool calls per message & server-side user ID injection enforced.</span>
        </div>

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
