'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { ChatMessage, PlanProposal, ToolCallRecord, ChartSpec } from '@/lib/types';
import { ChatMarkdown } from './ChatMarkdown';
import { InlineChatChart } from './InlineChatChart';
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
  CheckSquare,
  Copy,
  ChevronDown,
  ChevronUp,
  Cpu,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

export default function ChatPage() {
  const { user } = useAuth();
  const currency = user?.profile?.currency || 'USD';
  const isINR = currency.toUpperCase() === 'INR';
  const currencySym = isINR ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));

  const laptopPrompt = isINR
    ? "What happens to my savings if I reduce spending by ₹5,000 and buy a ₹45,000 laptop?"
    : `What happens to my savings if I reduce spending by ${currencySym}200 and buy a ${currencySym}1,000 laptop?`;

  const suggestedQuestions = [
    { label: "Simulate laptop purchase", query: laptopPrompt },
    { label: "30-day personal summary", query: "Give me a comprehensive summary of my recent finances, study hours, and habits." },
    { label: "Forecast savings (6M)", query: "Forecast my monthly savings over the next 6 months with uncertainty bands." },
    { label: "Study vs sleep trend", query: "How do my study scores correlate with my sleep duration? Show the trend." },
    { label: "Check habit burnout risk", query: "Predict my current habit streak continuation probability and burnout risk score." },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeToolActivity, setActiveToolActivity] = useState<string | null>(null);
  const [proposedPlans, setProposedPlans] = useState<PlanProposal[]>([]);
  const [planActionStatus, setPlanActionStatus] = useState<Record<string, 'approved' | 'dismissed'>>({});
  const [expandedToolChips, setExpandedToolChips] = useState<Record<string, boolean>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('error');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleClearHistory = () => {
    setShowConfirmClear(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await api.clearChatHistory();
      // Immediately empty messages and charts in the UI without a browser refresh
      setMessages([]);
      setProposedPlans([]);
      setPlanActionStatus({});
      setShowConfirmClear(false);
    } catch (err: any) {
      console.error('Failed to clear chat history:', err);
      setToastMessage(err.message || 'Failed to clear chat history');
      setToastType('error');
      setShowConfirmClear(false);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend || inputMessage).trim();
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

      // Extract tool results if present
      const toolResults = turnResponse.tool_calls?.map((tc) => tc.result).filter(Boolean);

      // Append assistant message
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: turnResponse.content,
        tool_calls: turnResponse.tool_calls,
        tool_results: toolResults && toolResults.length > 0 ? toolResults : undefined,
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

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const toggleToolChip = (chipKey: string) => {
    setExpandedToolChips((prev) => ({
      ...prev,
      [chipKey]: !prev[chipKey],
    }));
  };

  /**
   * Helper to format tool call summary
   */
  const getToolCallSummary = (toolName: string, args: Record<string, any> = {}) => {
    switch (toolName) {
      case 'run_simulation':
        return `Horizon: ${args.horizon_months || 6}M • Model: ${args.model || 'parametric'} • Iterations: ${args.iterations ? Number(args.iterations).toLocaleString() : '15,000'}`;
      case 'run_prediction':
        return `Domain: ${args.domain || 'overview'} • Projection Horizon: ${args.horizon || 6}M`;
      case 'get_user_summary':
        return `Timeframe: ${args.preset || '30d'} • Aggregates Finance, Study, and Habits`;
      case 'create_plan':
        return `Action Plan: "${args.title || 'Untitled'}" (${args.domain || 'general'})`;
      case 'update_plan':
        return `Plan Update: "${args.title || args.plan_id}"`;
      case 'get_recommendations':
        return `Rules engine evaluated against current metrics`;
      default:
        return `Arguments: ${JSON.stringify(args)}`;
    }
  };

  /**
   * Helper to extract chart spec from either tool_calls or tool_results
   */
  const extractChartSpecs = (msg: ChatMessage): ChartSpec[] => {
    const specs: ChartSpec[] = [];

    // Check in tool_calls
    if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (tc.result && tc.result.chart_spec) {
          specs.push(tc.result.chart_spec);
        }
      }
    }

    // Check in tool_results (reloaded from DB history)
    if (msg.tool_results) {
      if (Array.isArray(msg.tool_results)) {
        for (const res of msg.tool_results) {
          if (res && res.chart_spec) {
            // Avoid duplicates
            if (!specs.some((s) => s.type === res.chart_spec.type)) {
              specs.push(res.chart_spec);
            }
          }
        }
      } else if (msg.tool_results.chart_spec) {
        if (!specs.some((s) => s.type === msg.tool_results.chart_spec.type)) {
          specs.push(msg.tool_results.chart_spec);
        }
      }
    }

    return specs;
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-6.5rem)] space-y-3">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bento-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 shadow-sm flex-shrink-0">
            <Sparkles className="w-5 h-5 text-teal-400 dark:text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">Twin Bot</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono">
                Personal Coach
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Your personal coach for life, study, and financial habits — conversational guidance grounded in your data and general best practices.
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
              data-testid="clear-chat-button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium transition shadow-sm"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Suggested Questions Horizontal Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1 flex-shrink-0">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Suggestions:</span>
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputMessage(q.query);
              inputRef.current?.focus();
            }}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl inner-panel hover:border-teal-500/50 text-[11px] font-medium text-stone-700 dark:text-stone-300 transition hover:bg-white dark:hover:bg-stone-800 shadow-sm"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-3 rounded-2xl bg-[#FAF8F3] dark:bg-[#141210] border border-[#E6DFD3] dark:border-[#2D2721]">
        {loadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-stone-500">Retrieving digital twin chat history...</p>
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
                Explore financial runway, simulate what-if scenarios, track study vs sleep tradeoffs, inspect burnout risks, or create actionable plans.
              </p>
            </div>

            {/* Quick Prompts Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full pt-2">
              {suggestedQuestions.slice(0, 4).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.query)}
                  className="p-3 text-left rounded-xl inner-panel hover:border-teal-400/50 transition text-xs text-stone-700 dark:text-stone-300 group shadow-sm"
                >
                  <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 flex items-center justify-between">
                    <span>{q.label}</span>
                    <ArrowRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                    &quot;{q.query}&quot;
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const chartSpecs = extractChartSpecs(msg);
            const msgKey = msg.id || `msg-${idx}`;
            const isCopied = copiedMessageId === msgKey;

            return (
              <div
                key={msgKey}
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
                  {/* Tool Call Chips with expandable summary (Requirement 2) */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="space-y-1.5 pb-2 border-b border-stone-100 dark:border-stone-800 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400">
                        <Wrench className="w-3 h-3" />
                        <span>Executed Tools ({msg.tool_calls.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.tool_calls.map((tc, tcIdx) => {
                          const chipKey = `${msgKey}-tc-${tcIdx}`;
                          const isExpanded = !!expandedToolChips[chipKey];
                          const summary = getToolCallSummary(tc.tool_name, tc.arguments);

                          return (
                            <div key={tcIdx} className="w-full">
                              <button
                                onClick={() => toggleToolChip(chipKey)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700/80 text-[10px] text-stone-800 dark:text-stone-200 font-mono transition"
                              >
                                <Cpu className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                <span className="font-bold">{tc.tool_name}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-1 p-2 rounded-xl inner-panel border border-stone-200 dark:border-stone-700 text-[11px] font-sans space-y-1">
                                  <div className="text-stone-700 dark:text-stone-300 font-medium">
                                    {summary}
                                  </div>
                                  {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                                    <div className="text-[10px] font-mono text-stone-500 pt-0.5">
                                      Params: {JSON.stringify(tc.arguments)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Main Message Content */}
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <ChatMarkdown content={msg.content} />
                  )}

                  {/* Inline Charts built strictly from tool output (Requirement 3) */}
                  {msg.role !== 'user' && chartSpecs.map((spec, sIdx) => (
                    <InlineChatChart key={`chart-${msgKey}-${sIdx}`} spec={spec} />
                  ))}

                  {/* Message Footer with Provider Badge & Copy Button (Requirement 2 & 4) */}
                  <div
                    className={`text-[10px] pt-1.5 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800/60 ${
                      msg.role === 'user' ? 'text-stone-300 dark:text-stone-600 justify-end' : 'text-stone-500 justify-between'
                    }`}
                  >
                    {msg.role !== 'user' && (
                      <div className="flex items-center gap-2">
                        {/* Provider Badge */}
                        {msg.provider === 'offline' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                            Offline Engine
                          </span>
                        ) : msg.provider === 'openai_compatible' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800/60">
                            Fallback AI {msg.model ? `(${msg.model})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60">
                            Gemini {msg.model ? `(${msg.model})` : ''}
                          </span>
                        )}

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyMessage(msgKey, msg.content)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
                          title="Copy message to clipboard"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
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
            );
          })
        )}

        {/* Live Tool Calling Activity Indicator */}
        {activeToolActivity && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-800 dark:text-teal-200 text-xs animate-pulse max-w-md">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" />
            <span>{activeToolActivity}</span>
          </div>
        )}

        {/* Proposed Plans Confirmation Cards in New Bento Style (Requirement 4) */}
        {proposedPlans.map((proposal, pIdx) => {
          const key = `${proposal.title}-${pIdx}`;
          const status = planActionStatus[key];

          return (
            <div
              key={key}
              className="p-4 rounded-2xl bento-card border-teal-500/40 max-w-xl space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                      Proposed Plan Confirmation
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{proposal.title}</h3>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 capitalize border border-stone-200 dark:border-stone-700 font-mono">
                  {proposal.domain}
                </span>
              </div>

              {proposal.description && (
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed inner-panel p-3 rounded-xl">
                  {proposal.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-[11px] text-stone-600 dark:text-stone-400">
                {proposal.due_date && (
                  <div className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Target: {proposal.due_date}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 capitalize">
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                  <span>Status: {proposal.status || 'pending'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {status === 'approved' ? (
                <div className="flex items-center gap-2 text-xs text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/50 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800/60 font-medium">
                  <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Plan saved to active action plans!</span>
                  <Link href="/plans" className="ml-auto underline font-bold hover:text-teal-600">
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
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
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

        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-stone-400" />
            <span>Figures and projections strictly grounded in your database logs.</span>
          </span>
          <span className="font-mono">Max 5 tool calls / turn</span>
        </div>
      </form>

      {/* Confirmation Dialog Modal */}
      {showConfirmClear && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          data-testid="confirm-clear-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-[#1C1A17] border border-[#E6DFD3] dark:border-[#2D2721] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="clear-dialog-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Clear Chat History?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  This will remove all messages and generated charts from your view.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                disabled={isClearing}
                data-testid="cancel-clear-btn"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                data-testid="confirm-clear-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
