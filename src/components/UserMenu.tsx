import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, History, LogOut } from "lucide-react";
import { UserAccount, Entitlements } from "../types/engine";

interface UserMenuProps {
  user: UserAccount;
  entitlements: Entitlements;
  onLogout: () => void;
  onOpenUpgrade: () => void;
  onOpenHistory?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  entitlements,
  onLogout,
  onOpenUpgrade,
  onOpenHistory,
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
        className="flex items-center gap-2 px-2.5 h-[32px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)] transition-colors cursor-pointer text-[13px] font-medium"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="w-5 h-5 rounded-[4px] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-5 h-5 rounded-[4px] bg-[var(--border)] text-[var(--text)] font-medium text-[11px] flex items-center justify-center">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate max-w-[120px]">{user.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="user-dropdown-menu"
          role="menu"
          className="absolute right-0 mt-1.5 w-56 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] shadow-lg p-1 z-50 text-[13px]"
        >
          {/* User info row */}
          <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
            <div className="font-medium text-[var(--text)] truncate">{user.name}</div>
            <div className="text-[12px] text-[var(--muted)] truncate">{user.email}</div>
          </div>

          {entitlements.plan === "free" && (
            <button
              type="button"
              id="menu-upgrade-btn"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenUpgrade();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Upgrade to Pro</span>
            </button>
          )}

          {onOpenHistory && (
            <button
              type="button"
              id="menu-history-btn"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenHistory();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              <History className="w-4 h-4 text-[var(--muted)]" />
              <span>Analysis history</span>
            </button>
          )}

          <div className="h-[1px] bg-[var(--border)] my-1" />

          <button
            type="button"
            id="menu-logout-btn"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};
