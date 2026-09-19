import React, { useState, useRef, useEffect } from "react";
import {
  User,
  LogOut,
  Sparkles,
  ShieldCheck,
  Zap,
  Mail,
  ExternalLink,
  ChevronDown,
  Check,
} from "lucide-react";
import { UserAccount, Entitlements } from "../types/engine";

interface UserMenuProps {
  user: UserAccount;
  entitlements: Entitlements;
  onLogout: () => void;
  onOpenUpgrade: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  entitlements,
  onLogout,
  onOpenUpgrade,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        id="user-profile-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer shadow-2xs group active:scale-98"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-500/30"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center justify-center font-display">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 max-w-[100px] truncate font-display hidden sm:inline">
          {user.name}
        </span>

        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
          {entitlements.plan}
        </span>

        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="user-dropdown-menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User profile summary */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl mb-1">
            <div className="flex items-center gap-2.5">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold text-sm flex items-center justify-center font-display">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-xs font-display">
                  {user.name}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {user.email}
                </div>
              </div>
            </div>

            {/* Provider status badge */}
            <div className="mt-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between text-[10px]">
              <span className="text-zinc-400">Connected with:</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Mail className="w-3 h-3" />
                <span>Google / Gmail</span>
                <Check className="w-3 h-3 text-emerald-500" />
              </span>
            </div>
          </div>

          {/* Quota overview */}
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Today's EXPLAIN Quota</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                {entitlements.daily_used} / {entitlements.daily_limit}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (entitlements.daily_used / entitlements.daily_limit) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Upgrade prompt if free */}
          {entitlements.plan === "free" && (
            <button
              type="button"
              id="dropdown-upgrade-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenUpgrade();
              }}
              className="w-full mt-1 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer border border-amber-500/20 font-display"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Upgrade to Slowgres Pro</span>
              </span>
              <span className="text-[10px] bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded font-bold">
                $19/mo
              </span>
            </button>
          )}

          {/* Sign out */}
          <button
            type="button"
            id="sign-out-btn"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full mt-1 p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
