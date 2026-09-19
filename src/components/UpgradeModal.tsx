import React from "react";
import { X, Check } from "lucide-react";
import { Entitlements } from "../types/engine";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentEntitlements: Entitlements;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  currentEntitlements,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="upgrade-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        id="upgrade-modal-card"
        className="bg-[var(--bg)] border border-[var(--border)] rounded-[8px] shadow-xl max-w-lg w-full p-5 text-[13px] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[var(--text)]">
              Slowgres Pro
            </h2>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Remove daily analysis limits and keep unlimited history.
            </p>
          </div>
          <button
            id="close-upgrade-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing comparison */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Current / Free */}
          <div className="p-3.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] space-y-3">
            <div>
              <div className="font-medium text-[var(--text)] text-[14px]">Free</div>
              <div className="text-[18px] font-semibold text-[var(--text)] mt-1">$0</div>
            </div>
            <ul className="space-y-2 text-[12px] text-[var(--muted)] list-none p-0 m-0">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                <span>10 plans/day (signed out)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                <span>25 plans/day (signed in)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                <span>7-day local history</span>
              </li>
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="p-3.5 rounded-[6px] border border-[var(--accent)] bg-[var(--surface)] space-y-3 relative">
            <div>
              <div className="font-medium text-[var(--text)] text-[14px]">Pro</div>
              <div className="text-[18px] font-semibold text-[var(--text)] mt-1">
                $12 <span className="text-[12px] text-[var(--muted)] font-normal">/ month</span>
              </div>
            </div>
            <ul className="space-y-2 text-[12px] text-[var(--text)] list-none p-0 m-0">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                <span>Unlimited plan analyses</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                <span>Unlimited local history</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" />
                <span>Export analysis reports</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2">
          {currentEntitlements.plan === "premium" ? (
            <div className="p-2.5 text-center text-[12px] font-medium text-[var(--ok)] bg-[var(--surface)] rounded-[6px] border border-[var(--border)]">
              You are currently on Slowgres Pro
            </div>
          ) : (
            <button
              id="confirm-upgrade-btn"
              type="button"
              onClick={() => {
                onUpgrade();
                onClose();
              }}
              className="w-full h-[36px] rounded-[6px] bg-[var(--text)] text-[var(--bg)] font-medium text-[13px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Upgrade to Pro ($12/mo)
            </button>
          )}
          <p className="text-center text-[11px] text-[var(--muted)] mt-2">
            14-day refund window. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};
