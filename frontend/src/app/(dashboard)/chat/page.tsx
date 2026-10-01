'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ChatMessage, PlanProposal, ToolCallRecord } from '@/lib/types';
import {
  MessageSquare,
  Sparkles,
  Send,
  Trash2,
  Bot,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Wrench,
  Check,
  CheckSquare
} from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeToolActivity, setActiveToolActivity] = useState<string | null>(null);
  const [proposedPlans, setProposedPlans] = useState<PlanProposal[]>([]);
  const [planActionStatus, setPlanActionStatus] = useState<Record<string, 'approved' | 'dismissed'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeToolActivity, proposedPlans]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await api.getChatHistory(40);
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your chat history?')) return;
    try {
      await api.clearChatHistory();
      setMessages([]);
      setProposedPlans([]);
      setPlanActionStatus({});
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || loading) return;

    setInputMessage('');

    // Append optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);
    setActiveToolActivity('Consulting digital twin model...');

    try {
      const turnResponse = await api.sendChatMessage(trimmed);

      // If tool calls took place, display badges
      if (turnResponse.tool_calls && turnResponse.tool_calls.length > 0) {
        const toolNames = turnResponse.tool_calls.map((t) => t.tool_name).join(', ');
        setActiveToolActivity(`Executed: ${toolNames}`);
      }

      // Append assistant message
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: turnResponse.content,
        tool_calls: turnResponse.tool_calls,
        provider: turnResponse.provider,
        model: turnResponse.model,
        created_at: turnResponse.created_at || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If any plans were proposed, surface them for user confirmation
      if (turnResponse.proposed_plans && turnResponse.proposed_plans.length > 0) {
        setProposedPlans((prev) => [...prev, ...turnResponse.proposed_plans]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error communicating with Gemini assistant: ${err.message || 'Please check your connection and GEMINI_API_KEY.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setActiveToolActivity(null);
    }
  };

  const handleApprovePlan = async (proposal: PlanProposal, index: number) => {
    try {
      if (proposal.action === 'update' && proposal.plan_id) {
        await api.updatePlan(proposal.plan_id, {
          title: proposal.title,
          description: proposal.description,
          domain: proposal.domain,
          status: proposal.status,
          due_date: proposal.due_date,
        });
      } else {
        await api.createPlan({
          title: proposal.title,
          description: proposal.description,
          domain: proposal.domain,
          status: proposal.status || 'in_progress',
          due_date: proposal.due_date,
        });
      }
      setPlanActionStatus((prev) => ({ ...prev, [`${proposal.title}-${index}`]: 'approved' }));
    } catch (err: any) {
      alert(`Failed to save plan: ${err.message}`);
    }
  };

  const handleDismissPlan = (proposal: PlanProposal, index: number) => {
    setPlanActionStatus((prev) => ({ ...prev, [`${proposal.title}-${index}`]: 'dismissed' }));
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputMessage(promptText);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-6.5rem)] space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bento-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 shadow-sm flex-shrink-0">
            <Sparkles className="w-5 h-5 text-teal-400 dark:text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">Digital Twin AI Assistant</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono">
                Multi-Model Grounded
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Grounded exclusively in your personal data via server-injected tool calling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl inner-panel text-[11px] text-stone-600 dark:text-stone-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Strict Tool Grounding • 5-Call Loop Cap</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium transition shadow-sm"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#141210] border border-[#E6DFD3] dark:border-[#2D2721]">
        {loadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Retrieving chat history...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 shadow-md">
              <Bot className="w-7 h-7 text-teal-400 dark:text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Ask your Digital Twin</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mt-1">
                Explore your finances, simulate what-if scenarios, inspect habits and exam forecasts, or draft actionable improvement plans.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full pt-2">
              <button
                onClick={() => handleQuickPrompt("What happens to my savings if I reduce spending by $200 and buy a $1,000 laptop?")}
                className="p-3 text-left rounded-xl inner-panel hover:border-indigo-400/50 transition text-xs text-stone-700 dark:text-stone-300 group shadow-sm"
              >
                <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                  <span>Simulate Laptop Purchase</span>
                  <ArrowRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                  &quot;What happens to my savings if I reduce spending by $200 and buy a $1,000 laptop?&quot;
                </p>
              </button>

              <button
                onClick={() => handleQuickPrompt("Give me a comprehensive summary of my recent finances, study hours, and habits.")}
                className="p-3 text-left rounded-xl inner-panel hover:border-indigo-400/50 transition text-xs text-stone-700 dark:text-stone-300 group shadow-sm"
              >
                <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                  <span>Personal Twin Summary</span>
                  <ArrowRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                  &quot;Give me a comprehensive summary of my recent finances, study, and habits.&quot;
                </p>
              </button>

              <button
                onClick={() => handleQuickPrompt("What are my highest priority recommendations right now?")}
                className="p-3 text-left rounded-xl inner-panel hover:border-indigo-400/50 transition text-xs text-stone-700 dark:text-stone-300 group shadow-sm"
              >
                <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                  <span>Priority Recommendations</span>
                  <ArrowRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                  &quot;What are my highest priority recommendations right now?&quot;
                </p>
              </button>

              <button
                onClick={() => handleQuickPrompt("Can you create a structured study plan to improve my weekly exam preparation?")}
                className="p-3 text-left rounded-xl inner-panel hover:border-indigo-400/50 transition text-xs text-stone-700 dark:text-stone-300 group shadow-sm"
              >
                <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                  <span>Propose Action Plan</span>
                  <ArrowRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                  &quot;Can you create a structured study plan to improve my exam prep?&quot;
                </p>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 shadow-sm flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-teal-400 dark:text-teal-600" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-br-none ml-10 shadow-sm'
                    : 'bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] text-stone-900 dark:text-stone-100 rounded-bl-none shadow-sm'
                }`}
              >
                {/* Tool call badge */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-2 border-b border-stone-100 dark:border-stone-800 mb-2">
                    {msg.tool_calls.map((tc, tcIdx) => (
                      <span
                        key={tcIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] text-stone-700 dark:text-stone-300 font-mono"
                      >
                        <Wrench className="w-3 h-3 text-stone-500" />
                        <span>{tc.tool_name}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                <div
                  className={`text-[10px] pt-1 flex items-center gap-2 ${
                    msg.role === 'user' ? 'text-stone-300 dark:text-stone-600 justify-end' : 'text-stone-500 justify-between'
                  }`}
                >
                  {msg.role !== 'user' && (
                    <div className="flex items-center gap-1.5">
                      {msg.provider === 'offline' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          Offline assistant mode
                        </span>
                      ) : msg.provider === 'openai_compatible' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                          Fallback AI {msg.model ? `(${msg.model})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          Gemini {msg.model ? `(${msg.model})` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    <span>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-stone-200 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-300 flex-shrink-0 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Live Tool Calling Activity Indicator */}
        {activeToolActivity && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 text-xs animate-pulse max-w-md">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span>{activeToolActivity}</span>
          </div>
        )}

        {/* Proposed Plans Confirmation Cards (Requirement 5 & 9) */}
        {proposedPlans.map((proposal, pIdx) => {
          const key = `${proposal.title}-${pIdx}`;
          const status = planActionStatus[key];

          return (
            <div
              key={key}
              className="p-5 rounded-2xl bento-card border-teal-500/40 max-w-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                      Proposed Plan Confirmation
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{proposal.title}</h3>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 capitalize border border-stone-200 dark:border-stone-700">
                  {proposal.domain}
                </span>
              </div>

              {proposal.description && (
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed inner-panel p-3">
                  {proposal.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-[11px] text-stone-500 dark:text-stone-400">
                {proposal.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Target: {proposal.due_date}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                  <span className="capitalize">Status: {proposal.status || 'pending'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {status === 'approved' ? (
                <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800/60 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Plan saved to active action plans!</span>
                  <Link href="/plans" className="ml-auto underline font-bold">
                    View in Plans
                  </Link>
                </div>
              ) : status === 'dismissed' ? (
                <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700">
                  <XCircle className="w-4 h-4 text-stone-400" />
                  <span>Plan proposal dismissed.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleApprovePlan(proposal, pIdx)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Save Plan</span>
                  </button>
                  <button
                    onClick={() => handleDismissPlan(proposal, pIdx)}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <form onSubmit={handleSendMessage} className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question, simulate what-if scenarios, or create action plans..."
            disabled={loading}
            className="w-full bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] focus:border-stone-400 rounded-2xl py-3.5 pl-4 pr-12 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 shadow-sm outline-none transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="absolute right-2 p-2 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white dark:text-stone-900 disabled:text-stone-500 transition flex items-center justify-center shadow-sm disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-stone-400" />
            <span>Figures and projections strictly grounded in your database logs.</span>
          </span>
          <span className="font-mono">Max 5 tool calls / turn</span>
        </div>
      </form>
    </div>
  );
}
