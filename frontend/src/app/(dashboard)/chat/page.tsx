'use client';

import React, { useState, useEffect, useRef } from 'react';
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Digital Twin AI Assistant</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Grounded exclusively in your personal data via server-injected tool calling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Server User Injection & 5-Call Loop Cap</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium transition"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 p-2 rounded-2xl bg-slate-950/40 border border-slate-900">
        {loadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Retrieving chat history...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Ask your Digital Twin</h2>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Explore your finances, simulate what-if scenarios, inspect habits and exam forecasts, or draft actionable improvement plans.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full pt-2">
              <button
                onClick={() => handleQuickPrompt("What happens to my savings if I reduce spending by $200 and buy a $1,000 laptop?")}
                className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 transition text-xs text-slate-300 group"
              >
                <div className="font-medium text-white group-hover:text-purple-300 flex items-center justify-between">
                  <span>Simulate Laptop Purchase</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  &quot;What happens to my savings if I reduce spending by $200 and buy a $1,000 laptop?&quot;
                </p>
              </button>

              <button
                onClick={() => handleQuickPrompt("Give me a comprehensive summary of my recent finances, study hours, and habits.")}
                className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 transition text-xs text-slate-300 group"
              >
                <div className="font-medium text-white group-hover:text-purple-300 flex items-center justify-between">
                  <span>Personal Twin Summary</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  &quot;Give me a comprehensive summary of my recent finances, study, and habits.&quot;
                </p>
              </button>

              <button
                onClick={() => handleQuickPrompt("What are my highest priority recommendations right now?")}
                className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 transition text-xs text-slate-300 group"
              >
                <div className="font-medium text-white group-hover:text-purple-300 flex items-center justify-between">
                  <span>Priority Recommendations</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  &quot;What are my highest priority recommendations right now?&quot;
                </p>
              </button>

              <button
                onClick={() => handleQuickPrompt("Can you create a structured study plan to improve my weekly exam preparation?")}
                className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 transition text-xs text-slate-300 group"
              >
                <div className="font-medium text-white group-hover:text-purple-300 flex items-center justify-between">
                  <span>Propose Action Plan</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
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
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-none ml-10'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                {/* Tool call badge */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1 border-b border-slate-800/80 mb-2">
                    {msg.tool_calls.map((tc, tcIdx) => (
                      <span
                        key={tcIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 font-mono"
                      >
                        <Wrench className="w-3 h-3 text-purple-400" />
                        <span>{tc.tool_name}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                <div
                  className={`text-[10px] pt-1 flex items-center gap-1 ${
                    msg.role === 'user' ? 'text-purple-200 justify-end' : 'text-slate-500'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Live Tool Calling Activity Indicator */}
        {activeToolActivity && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs animate-pulse max-w-md">
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
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
              className="p-4 rounded-2xl bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/30 max-w-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
                      Proposed Plan Confirmation
                    </span>
                    <h3 className="text-sm font-bold text-white">{proposal.title}</h3>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 capitalize border border-slate-700">
                  {proposal.domain}
                </span>
              </div>

              {proposal.description && (
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                  {proposal.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                {proposal.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target: {proposal.due_date}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span className="capitalize">Status: {proposal.status || 'pending'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {status === 'approved' ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Plan approved and saved to your action tracker!</span>
                </div>
              ) : status === 'dismissed' ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>Plan proposal dismissed.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleApprovePlan(proposal, pIdx)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Save Plan</span>
                  </button>
                  <button
                    onClick={() => handleDismissPlan(proposal, pIdx)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
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
            className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 rounded-2xl py-3.5 pl-4 pr-12 text-xs text-white placeholder-slate-500 outline-none transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="absolute right-2 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white disabled:text-slate-600 transition flex items-center justify-center shadow-md disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-600" />
            <span>Figures and projections strictly grounded in your database logs.</span>
          </span>
          <span>Max 5 tool calls / turn</span>
        </div>
      </form>
    </div>
  );
}
