'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CashFlowDataPoint } from '@/lib/types';
import { TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
  currency?: string;
  savingsRate?: number;
}

const CustomTooltip = ({ active, payload, label, currency = 'USD' }: any) => {
  if (active && payload && payload.length) {
    const inc = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
    const exp = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
    const net = payload.find((p: any) => p.dataKey === 'net_savings')?.value || (inc - exp);
    const rate = inc > 0 ? ((net / inc) * 100).toFixed(1) : '0.0';

    return (
      <div className="p-3 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-semibold text-slate-300 border-b border-slate-800/80 pb-1 font-mono">
          {label}
        </div>
        <div className="flex items-center justify-between text-emerald-400">
          <span className="flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Income:
          </span>
          <span className="font-mono font-medium">
            {currency} {Number(inc).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-rose-400">
          <span className="flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Expenses:
          </span>
          <span className="font-mono font-medium">
            {currency} {Number(exp).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between">
          <span className="text-slate-400">Net Savings:</span>
          <span className={`font-mono font-bold ${net >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
            {currency} {Number(net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Savings Rate:</span>
          <span className="font-mono">{rate}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CashFlowChart({
  data,
  currency = 'USD',
  savingsRate = 0,
}: CashFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
        <TrendingUp className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
        <p>No financial entries recorded in this time range.</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Log income and expenses to view the cash flow trajectory.</p>
      </div>
    );
  }

  // Format short date for X-Axis (e.g. "Sep 15" or "09/15")
  const formattedData = data.map((d) => ({
    ...d,
    displayDate: d.date.length > 5 ? d.date.slice(5) : d.date,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#E11D48" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="displayDate"
            stroke="#64748B"
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            stroke="#64748B"
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />

          <Tooltip content={<CustomTooltip currency={currency} />} />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', color: '#94A3B8' }}
          />

          <Bar
            dataKey="income"
            name="Income"
            fill="url(#incomeGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="url(#expenseGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Line
            type="monotone"
            dataKey="net_savings"
            name="Net Savings"
            stroke="#6366F1"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#6366F1', stroke: '#1E1B4B', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#818CF8' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
