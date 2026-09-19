import React from "react";
import { X } from "lucide-react";

export type LegalDocType = "privacy" | "terms" | "refunds" | null;

interface LegalModalProps {
  activeDoc: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ activeDoc, onClose }) => {
  if (!activeDoc) return null;

  return (
    <div
      id="legal-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="legal-modal-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50/80 dark:bg-zinc-950/60">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 font-display">
              {activeDoc === "privacy" && "Privacy Policy"}
              {activeDoc === "terms" && "Terms of Service"}
              {activeDoc === "refunds" && "Refund & Cancellation Policy"}
            </h2>
            <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-md border border-amber-500/20">
              compliance
            </span>
          </div>
          <button
            id="close-legal-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-300 space-y-4 leading-relaxed font-sans">
          {activeDoc === "privacy" && (
            <>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm font-display">
                1. Information We Collect and Zero-Data-Leaking Architecture
              </p>
              <p>
                Slowgres processes PostgreSQL execution plans provided by you via EXPLAIN (ANALYZE, FORMAT JSON).
                Query execution plans and SQL strings can contain proprietary schema metadata and data values.
                Our analysis engine executes 100% client-side in your browser. We do not share, sell, or transmit query plans or customer data to external advertisement networks or remote servers.
              </p>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm font-display">
                2. Philippine Data Privacy Act & GDPR Compliance
              </p>
              <p>
                We comply with Republic Act No. 10173 (Philippine Data Privacy Act of 2012) and the EU General Data
                Protection Regulation (GDPR). Users retain the right to delete their saved analyses at any time directly through the local browser storage controls.
              </p>
              <p className="italic text-zinc-400 text-[11px]">
                Status: Compliance document for merchant-of-record onboarding.
              </p>
            </>
          )}

          {activeDoc === "terms" && (
            <>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm font-display">
                1. Acceptance of Terms
              </p>
              <p>
                By accessing or using Slowgres, you agree to these Terms of Service. Slowgres provides database
                performance diagnostics and heuristic index suggestions. All recommendations are suggestions
                and must be verified by the user before executing in production databases.
              </p>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm font-display">
                2. Permitted Use & Quotas
              </p>
              <p>
                Free accounts are subject to daily analysis rate limits and payload boundaries. Automated scraping
                or attempting to bypass entitlements is strictly prohibited.
              </p>
              <p className="italic text-zinc-400 text-[11px]">
                Status: Compliance document for merchant-of-record onboarding.
              </p>
            </>
          )}

          {activeDoc === "refunds" && (
            <>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm font-display">
                1. Subscription Cancellation
              </p>
              <p>
                You may cancel your paid subscription at any time via the self-service Customer Portal.
                Upon cancellation, your subscription will remain active until the end of the current billing period,
                after which your account will transition to the Free tier.
              </p>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm font-display">
                2. Refund Policy
              </p>
              <p>
                Due to the immediate provisioning of compute resources, subscriptions are generally non-refundable
                once a billing period commences, except where mandated by applicable consumer protection laws.
              </p>
              <p className="italic text-zinc-400 text-[11px]">
                Status: Compliance document for merchant-of-record onboarding.
              </p>
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex justify-end">
          <button
            id="dismiss-legal-modal-btn"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold font-display rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-all cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
