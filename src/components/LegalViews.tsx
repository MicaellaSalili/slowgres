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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        id="legal-modal-card"
        className="bg-[var(--bg)] border border-[var(--border)] rounded-[8px] shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-[13px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-2 bg-[var(--surface)]">
          <h2 className="text-[16px] font-semibold text-[var(--text)]">
            {activeDoc === "privacy" && "Privacy Policy"}
            {activeDoc === "terms" && "Terms of Service"}
            {activeDoc === "refunds" && "Refund & Cancellation Policy"}
          </h2>
          <button
            id="close-legal-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto text-[13px] text-[var(--muted)] space-y-4 leading-relaxed">
          {activeDoc === "privacy" && (
            <>
              <p className="font-semibold text-[var(--text)] text-[14px]">
                1. Information We Collect and Client-Side Processing
              </p>
              <p>
                Slowgres processes PostgreSQL execution plans provided by you via EXPLAIN (ANALYZE, FORMAT JSON).
                Query execution plans and SQL strings can contain proprietary schema metadata and data values.
                Our analysis engine executes 100% client-side in your browser. We do not share, sell, or transmit query plans or customer data to external advertisement networks or remote servers.
              </p>
              <p className="font-semibold text-[var(--text)] text-[14px]">
                2. Data Privacy & Local Browser Storage
              </p>
              <p>
                Analyses are stored exclusively in your local browser storage. Users retain the right to delete their saved analyses at any time directly through the local browser storage controls or the in-app History view.
              </p>
            </>
          )}

          {activeDoc === "terms" && (
            <>
              <p className="font-semibold text-[var(--text)] text-[14px]">
                1. Acceptance of Terms
              </p>
              <p>
                By accessing and using Slowgres, you accept and agree to be bound by these terms. Slowgres is a developer diagnostic tool designed to provide rule-based recommendations for PostgreSQL query execution plans.
              </p>
              <p className="font-semibold text-[var(--text)] text-[14px]">
                2. Index Recommendations Disclaimer
              </p>
              <p>
                Suggested index DDL is advisory only. You are solely responsible for testing and evaluating suggested indexes in a staging environment before applying them to production systems.
              </p>
            </>
          )}

          {activeDoc === "refunds" && (
            <>
              <p className="font-semibold text-[var(--text)] text-[14px]">
                1. Pro Subscription Billing
              </p>
              <p>
                Slowgres Pro subscriptions are billed monthly or annually. You may cancel your subscription at any time.
              </p>
              <p className="font-semibold text-[var(--text)] text-[14px]">
                2. 14-Day Refund Window
              </p>
              <p>
                If you are unsatisfied with Slowgres Pro within 14 days of your initial purchase, contact support to request a full refund.
              </p>
            </>
          )}
        </div>

        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-[32px] px-3 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--text)] text-[12px] font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
