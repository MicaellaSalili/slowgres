import React from "react";
import { Zap, Moon, Sun } from "lucide-react";
import { Entitlements, UserAccount } from "../types/engine";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenHistory: () => void;
  onOpenUpgrade: () => void;
  onResetToAnalyzer?: () => void;
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
  onResetToAnalyzer,
  entitlements,
  historyCount,
  user,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header
      id="slowgres-header"
      className="sticky top-0 z-30 h-[56px] border-b border-[var(--border)] bg-[var(--bg)] transition-colors"
    >
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Left: Brand mark & Nav links */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onResetToAnalyzer}
            className="flex items-center gap-2 text-left cursor-pointer focus-visible:outline-none"
            aria-label="Slowgres home"
          >
            <Zap className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]" />
            <span className="font-semibold text-[16px] tracking-tight text-[var(--text)] font-display">
              Slowgres
            </span>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              id="nav-analyzer-btn"
              onClick={onResetToAnalyzer}
              className="px-2.5 py-1 text-[13px] font-medium text-[var(--text)] hover:text-[var(--text)] rounded-[6px] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              Analyzer
            </button>
            <button
              type="button"
              id="nav-history-btn"
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)] rounded-[6px] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              <span>History</span>
              {historyCount > 0 && (
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  ({historyCount})
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right: Theme toggle & Account */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)] transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <UserMenu
              user={user}
              entitlements={entitlements}
              onLogout={onLogout}
              onOpenUpgrade={onOpenUpgrade}
              onOpenHistory={onOpenHistory}
            />
          ) : (
            <button
              type="button"
              id="header-login-btn"
              onClick={() => onOpenAuth("signup")}
              className="h-[32px] px-3 rounded-[6px] bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity text-[13px] font-medium cursor-pointer"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
