import React from "react";
import { Zap, Moon, Sun, History, Sparkles, ShieldCheck, Database, Mail, LogIn } from "lucide-react";
import { Entitlements, UserAccount } from "../types/engine";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenHistory: () => void;
  onOpenUpgrade: () => void;
  onOpenLegal: (doc: "privacy" | "terms" | "refunds") => void;
  entitlements: Entitlements;
  historyCount: number;
  user: UserAccount | null;
  onOpenAuth: (mode?: "login" | "signup") => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenHistory,
  onOpenUpgrade,
  onOpenLegal,
  entitlements,
  historyCount,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const usageRatio = Math.min(1, entitlements.daily_used / entitlements.daily_limit);
  const isNearLimit = usageRatio >= 0.8;

  return (
    <header
      id="slowgres-header"
      className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative group flex items-center justify-center">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-sm shadow-zinc-900/10 dark:shadow-none ring-1 ring-zinc-900/10 dark:ring-zinc-100/20 transition-transform group-hover:scale-105">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 items-center justify-center text-[7px] font-bold text-zinc-950">
                PG
              </span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 font-display">
                Slowgres
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md border border-zinc-200 dark:border-zinc-700/60">
                PG 12-17
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden md:flex items-center gap-1 font-sans">
              <span>PostgreSQL EXPLAIN analyzer</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">Find out why it's slow</span>
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quota tracker (desktop) */}
          <div
            id="quota-meter-badge"
            className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 text-xs shadow-2xs"
          >
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Daily Quota</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={`font-semibold ${isNearLimit ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                {entitlements.daily_used}
              </span>
              <span className="text-zinc-400">/</span>
              <span className="text-zinc-500 dark:text-zinc-400">{entitlements.daily_limit}</span>
            </div>
            <div className="w-14 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isNearLimit ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, Math.max(8, usageRatio * 100))}%` }}
              />
            </div>
          </div>

          {/* Quota tracker (mobile compact pill) */}
          <div
            id="mobile-quota-badge"
            className="flex md:hidden items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 text-[11px] font-mono"
            title={`Daily Quota: ${entitlements.daily_used} used of ${entitlements.daily_limit} limit`}
          >
            <Zap className={`w-3 h-3 ${isNearLimit ? "text-amber-500 fill-amber-500" : "text-emerald-500 fill-emerald-500"}`} />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{entitlements.daily_used}</span>
            <span className="text-zinc-400">/</span>
            <span className="text-zinc-500">{entitlements.daily_limit}</span>
          </div>

          {/* Upgrade button */}
          {entitlements.plan === "free" && (
            <button
              id="upgrade-header-btn"
              onClick={onOpenUpgrade}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-400/10 dark:hover:bg-amber-400/20 text-amber-900 dark:text-amber-300 text-xs font-semibold border border-amber-500/30 dark:border-amber-400/30 transition-all duration-150 cursor-pointer shadow-2xs active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Upgrade</span>
            </button>
          )}

          {/* History drawer trigger */}
          <button
            id="history-drawer-btn"
            onClick={onOpenHistory}
            className="relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-all duration-150 cursor-pointer shadow-2xs active:scale-98"
            title="View Analysis History"
          >
            <History className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 rounded-md text-zinc-800 dark:text-zinc-200">
                {historyCount}
              </span>
            )}
          </button>

          {/* User Account / Login Controls */}
          {user ? (
            <UserMenu
              user={user}
              entitlements={entitlements}
              onLogout={onLogout}
              onOpenUpgrade={onOpenUpgrade}
            />
          ) : (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                id="header-login-btn"
                onClick={() => onOpenAuth("login")}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-all cursor-pointer font-display"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>

              <button
                type="button"
                id="header-connect-gmail-btn"
                onClick={() => onOpenAuth("signup")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98 font-display"
                title="Connect with Gmail to create account"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Connect with Gmail</span>
                <span className="sm:hidden">Connect</span>
              </button>
            </div>
          )}

          {/* Dark / Light toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-all duration-150 cursor-pointer shadow-2xs active:scale-95"
            aria-label="Toggle Color Theme"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          {/* Legal / Zero data leak trigger */}
          <button
            id="privacy-shield-btn"
            onClick={() => onOpenLegal("privacy")}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 transition-all duration-150 cursor-pointer shadow-2xs active:scale-95"
            title="Zero-Data-Leaking Policy & Legal"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
