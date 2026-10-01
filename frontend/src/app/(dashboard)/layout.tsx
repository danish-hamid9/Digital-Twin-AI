'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import {
  Sparkles,
  LayoutDashboard,
  Wallet,
  GraduationCap,
  Activity,
  Sliders,
  Lightbulb,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  User as UserIcon,
  Coins,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Finance', href: '/finance', icon: Wallet, color: 'text-emerald-500 dark:text-emerald-400' },
  { label: 'Study', href: '/study', icon: GraduationCap, color: 'text-indigo-500 dark:text-indigo-400' },
  { label: 'Habits', href: '/habits', icon: Activity, color: 'text-amber-500 dark:text-amber-400' },
  { label: 'Simulator', href: '/simulator', icon: Sliders, color: 'text-sky-500 dark:text-sky-400' },
  { label: 'Insights & Tips', href: '/recommendations', icon: Lightbulb, color: 'text-yellow-500 dark:text-yellow-400' },
  { label: 'Plans', href: '/plans', icon: CheckSquare, color: 'text-teal-500 dark:text-teal-400' },
  { label: 'Chat', href: '/chat', icon: MessageSquare, color: 'text-purple-500 dark:text-purple-400' },
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
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading Digital Twin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold tracking-tight text-slate-900 dark:text-white block text-sm">Digital Twin AI</span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono tracking-wider uppercase font-semibold">Life Simulator</span>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-white' : item.color || 'text-slate-400 dark:text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Card & Logout */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
        <div className="inner-panel p-2.5 mb-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 font-bold text-xs">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {profile?.full_name || user.email}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              <Coins className="w-3 h-3" />
              <span>{profile?.currency || 'USD'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar – desktop static solid editorial, mobile slide-in */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 border-r border-[#E6DFD3] dark:border-[#2D2721]
          bg-[#FAF7F0] dark:bg-[#181614]
          flex flex-col p-4 flex-shrink-0 shadow-sm lg:shadow-none
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        aria-label="Sidebar navigation"
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Solid Warm Editorial */}
        <header className="h-16 border-b border-[#E6DFD3] dark:border-[#2D2721] px-4 md:px-8 flex items-center justify-between bg-[#FAF7F0] dark:bg-[#181614] sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-pulse" />
              <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-bold">Digital Twin:</span>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{profile?.full_name || user.email}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800 border border-stone-300/80 dark:border-stone-700 text-[11px] text-stone-700 dark:text-stone-300 font-mono font-bold">
                {profile?.currency || 'USD'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              id="dark-mode-toggle"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white bg-white dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700/80 border border-stone-300/80 dark:border-stone-700 shadow-sm transition"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700" />}
            </button>

            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-bold shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400 dark:text-teal-600" />
              <span className="hidden sm:inline">Ask Twin Bot</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
