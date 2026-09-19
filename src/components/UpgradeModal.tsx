import React from "react";
import { X, Check, Sparkles, Shield, Zap, Infinity } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="upgrade-modal-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto text-xs transition-all font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top banner */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-linear-to-b from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/5 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 mb-2.5">
              <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Slowgres Premium & Team Tiers</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-display">
              Unlock Unlimited PostgreSQL Plan Analysis
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 text-xs font-sans max-w-lg leading-relaxed">
              Diagnose complex query plans with zero quota ceilings, export reports, and team collaboration.
            </p>
          </div>
          <button
            id="close-upgrade-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing comparison grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Tier */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex flex-col justify-between">
            <div>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-display">
                Community Free
              </div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 font-sans">
                For solo developers tuning occasional slow queries.
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-3 font-display">
                $0 <span className="text-xs font-normal text-zinc-400 font-sans">/ forever</span>
              </div>

              <ul className="mt-5 space-y-2.5 text-zinc-600 dark:text-zinc-300 font-sans">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>10 query analyses per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>All 6 core diagnostic rules & index DDL</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>7-day local analysis history</span>
                </li>
                <li className="flex items-center gap-2 text-zinc-400">
                  <span className="w-3.5 h-3.5 text-center leading-none">✕</span>
                  <span>Export to JSON & Markdown</span>
                </li>
              </ul>
            </div>

            <button
              disabled={currentEntitlements.plan === "free"}
              className="mt-6 w-full py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-semibold opacity-70 cursor-default text-xs font-display"
            >
              Current Active Plan
            </button>
          </div>

          {/* Pro Tier */}
          <div className="p-5 rounded-2xl border-2 border-amber-500/80 bg-linear-to-b from-amber-500/5 to-transparent dark:bg-zinc-950/40 flex flex-col justify-between relative shadow-sm">
            <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-bold text-[9px] uppercase tracking-wider font-display shadow-xs">
              Most Popular
            </div>

            <div>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 font-display">
                <span>Slowgres Pro</span>
              </div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 font-sans">
                For backend engineers, DBAs, and high-throughput apps.
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-3 font-display">
                $19 <span className="text-xs font-normal text-zinc-400 font-sans">/ month</span>
              </div>

              <ul className="mt-5 space-y-2.5 text-zinc-700 dark:text-zinc-200 font-sans">
                <li className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  <Infinity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Unlimited query plan analyses</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited analysis retention & cloud sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>1-click Export to JSON & Markdown reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>100% Ad-free experience</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Multi-tenant team workspace & shared links</span>
                </li>
              </ul>
            </div>

            <button
              id="activate-pro-btn"
              onClick={() => {
                onUpgrade();
                onClose();
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-display"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Upgrade to Slowgres Pro</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 gap-2 font-sans">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure billing via Merchant of Record. Cancel anytime in self-serve portal.</span>
          </div>
          <span className="font-mono text-[10px]">Tax handling & EU/PH VAT included</span>
        </div>
      </div>
    </div>
  );
};
