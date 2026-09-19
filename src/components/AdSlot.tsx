import React from "react";

interface AdSlotProps {
  placement: "header_banner" | "sidebar_footer" | "landing_bottom" | "docs_inline";
  showAds?: boolean;
}

/**
 * AdSlot Component (Groundwork for Phase 6 monetization).
 *
 * DESIGN DECISION (privacy): Users paste query plans and SQL that reveal table names,
 * column names, and sensitive schema logic. NEVER load third-party ad scripts on pages
 * displaying user-submitted plans or saved analyses. Ads may ONLY appear on public,
 * non-sensitive pages (landing page, docs, blog/guides, pricing).
 *
 * This component renders nothing unless:
 * 1. The VITE_ADS_ENABLED environment flag is explicitly 'true'
 * 2. The user's active entitlements indicate show_ads === true (free tier)
 */
export const AdSlot: React.FC<AdSlotProps> = ({ placement, showAds = false }) => {
  // Feature flag read from environment variable
  const adsGloballyEnabled = import.meta.env.VITE_ADS_ENABLED === "true";

  // Strict double-guard: must be globally enabled AND user must be eligible for ads
  if (!adsGloballyEnabled || !showAds) {
    return null;
  }

  return (
    <div
      id={`ad-slot-${placement}`}
      className="my-4 p-5 border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-2xl text-center font-sans"
    >
      <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1 font-semibold">
        Sponsored ({placement})
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 italic">
        [Ad Slot Placeholder — Phase 6 Monetization Sandbox]
      </div>
    </div>
  );
};
