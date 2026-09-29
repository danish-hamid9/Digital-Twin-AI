'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import {
  Sparkles,
  LayoutDashboard,
  Wallet,
  GraduationCap,
  Activity,
  Sliders,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  User as UserIcon,
  Coins
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Finance', href: '/finance', icon: Wallet, color: 'text-emerald-500' },
  { label: 'Study', href: '/study', icon: GraduationCap, color: 'text-indigo-500' },
  { label: 'Habits', href: '/habits', icon: Activity, color: 'text-amber-500' },
  { label: 'Simulator', href: '/simulator', icon: Sliders, color: 'text-sky-500' },
  { label: 'Plans', href: '/plans', icon: CheckSquare, color: 'text-teal-500' },
  { label: 'Chat', href: '/chat', icon: MessageSquare, color: 'text-purple-500' },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading Digital Twin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 px-3 py-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white block text-sm">Digital Twin AI</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Life Simulator</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color || 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || user.email}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <Coins className="w-3 h-3" />
                <span>{profile?.currency || 'USD'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/30 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Profile:</span>
            <span className="text-sm font-medium text-white">{profile?.full_name || user.email}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono">
              Currency: {profile?.currency || 'USD'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Twin Bot</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
